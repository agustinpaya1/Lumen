import { createHash, createHmac, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';

const MAX_BODY_BYTES = 32 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEVELS = ['debug', 'info', 'warn', 'error', 'critical'] as const;
const DETAIL_KEYS = new Set([
  'name', 'message', 'code', 'status', 'statusCode', 'operation', 'attempt', 'attempts',
  'durationMs', 'count', 'online', 'retryable', 'reason', 'stack',
]);

type Level = (typeof LEVELS)[number];
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'warn' | 'error' | 'critical';
  message: string;
  details: unknown[];
  context: { eventKey: string; route: string; sessionId: string; online: boolean; release: string };
  breadcrumbs: { timestamp: string; level: Level; message: string }[];
}
type Env = Record<string, string | undefined>;
type Fetch = typeof globalThis.fetch;
interface Dependencies { env?: Env; fetch?: Fetch; now?: () => number; }
interface RpcResult {
  status: 'stored' | 'sent' | 'suppressed' | 'rate_limited' | 'busy' | 'claimed';
  entry?: LogEntry;
  leaseToken?: string;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function iso(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 35 && /^\d{4}-\d{2}-\d{2}T/.test(value)
    && Number.isFinite(Date.parse(value));
}

// Defense in depth: the public caller and its claimed severity/context are untrusted.
// Keep a small diagnostic vocabulary and never retain arbitrary object properties.
export function redact(value: string, limit: number): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/\b(?:https?:\/\/|blob:|data:)[^\s<>"']+/gi, '[url]')
    .replace(/\bBearer\s+[^\s,;"']+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[token]')
    .replace(/\b(?:sb_secret_|sb_publishable_|sk_live_|sk_test_)[A-Za-z0-9_-]+/g, '[token]')
    .replace(/\b\d{6,12}:[A-Za-z0-9_-]{20,}\b/g, '[token]')
    .replace(/\b(access[_-]?token|refresh[_-]?token|token|password|passwd|secret|api[_-]?key|authorization|cookie)\b["']?\s*[:=]\s*(?:"[^"\n]*"|'[^'\n]*'|[^\s,;}]+)/gi, '$1=[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b\+?\d[\d ()-]{7,}\d\b/g, '[number]')
    .slice(0, limit);
}
function cleanDetail(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return redact(value, 1200);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean' || value === null) return value;
  if (depth >= 3) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 10).map(item => cleanDetail(item, depth + 1));
  if (object(value)) {
    return Object.fromEntries(Object.entries(value).filter(([key]) => DETAIL_KEYS.has(key))
      .slice(0, 12).map(([key, item]) => [key, cleanDetail(item, depth + 1)]));
  }
  return null;
}
export function validateEntry(value: unknown): LogEntry | null {
  if (!object(value) || typeof value['id'] !== 'string' || !UUID.test(value['id'])
    || !iso(value['timestamp']) || !['warn', 'error', 'critical'].includes(String(value['level']))
    || typeof value['message'] !== 'string' || !value['message'].trim() || value['message'].length > 300
    || !Array.isArray(value['details']) || value['details'].length > 10
    || JSON.stringify(value['details']).length > 6000
    || !object(value['context']) || !Array.isArray(value['breadcrumbs']) || value['breadcrumbs'].length > 15) return null;
  const context = value['context'];
  if (typeof context['eventKey'] !== 'string' || context['eventKey'].length > 100
    || typeof context['route'] !== 'string' || context['route'].length > 200
    || typeof context['sessionId'] !== 'string' || !UUID.test(context['sessionId'])
    || typeof context['online'] !== 'boolean' || typeof context['release'] !== 'string'
    || context['release'].length > 100) return null;
  const breadcrumbs: LogEntry['breadcrumbs'] = [];
  for (const item of value['breadcrumbs']) {
    if (!object(item) || !iso(item['timestamp']) || !LEVELS.includes(item['level'] as Level)
      || typeof item['message'] !== 'string' || item['message'].length > 300) return null;
    breadcrumbs.push({ timestamp: new Date(item['timestamp']).toISOString(), level: item['level'] as Level,
      message: redact(item['message'], 300) });
  }
  // The app has static paths. Unknown paths may carry IDs or names and are not retained.
  const path = context['route'].split(/[?#]/, 1)[0];
  const route = ['/', '/home', '/camera', '/admin', '/memories'].includes(path) ? path : '/[other]';
  return {
    id: value['id'].toLowerCase(), timestamp: new Date(value['timestamp']).toISOString(),
    level: value['level'] as LogEntry['level'], message: redact(value['message'], 300),
    details: value['details'].map(item => cleanDetail(item)),
    context: { eventKey: redact(context['eventKey'], 100), route, sessionId: context['sessionId'].toLowerCase(),
      online: context['online'], release: redact(context['release'], 100) }, breadcrumbs,
  };
}
export function telegramText(entry: LogEntry): string {
  const trail = entry.breadcrumbs.slice(-10).map(item =>
    `${item.timestamp.slice(11, 19)} ${item.level.toUpperCase()} ${item.message.slice(0, 110)}`).join('\n');
  return [
    'LUMEN · CRITICAL (informe del cliente)', `ID: ${entry.id}`, `Hora UTC: ${entry.timestamp}`,
    `Evento: ${entry.context.eventKey || 'sin evento'}`, `Ruta: ${entry.context.route}`,
    `Versión: ${entry.context.release || 'desconocida'}`, `Conexión: ${entry.context.online ? 'online' : 'offline'}`,
    `Error: ${entry.message}`, `Detalle: ${JSON.stringify(entry.details).slice(0, 1300)}`,
    `Pasos previos:\n${trail || 'Sin pasos registrados'}`,
  ].join('\n').slice(0, 3900);
}

class BodyLimit extends Error {}
async function readJson(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new BodyLimit();
  if (!request.body) throw new Error('Missing body');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw new BodyLimit();
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}
function supabaseBase(env: Env): string | null {
  try {
    const url = new URL(env['SUPABASE_URL'] || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export function createLogHandler(dependencies: Dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const fetcher = dependencies.fetch ?? globalThis.fetch;
  const now = dependencies.now ?? Date.now;
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const allowed = (env['LOG_ALLOWED_ORIGINS'] || '').split(',').map(item => item.trim()).filter(Boolean);
    const production = env['VERCEL_ENV'] === 'production' || env['NODE_ENV'] === 'production';
    const originAllowed = origin !== null && (allowed.includes(origin)
      || (!production && allowed.length === 0 && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)));
    const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'Vary': 'Origin',
      'Content-Type': 'application/json; charset=utf-8' };
    if (originAllowed) headers['Access-Control-Allow-Origin'] = origin!;
    const respond = (status: number, body: object, retryAfter?: number) => new Response(JSON.stringify(body), {
      status, headers: { ...headers, ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}) },
    });
    if (production && allowed.length === 0) return respond(503, { ok: false, code: 'unavailable' }, 30);
    if (!originAllowed) return respond(403, { ok: false, code: 'forbidden_origin' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers,
      'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600' } });
    if (request.method !== 'POST') return respond(405, { ok: false, code: 'method_not_allowed' });
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return respond(415, { ok: false, code: 'unsupported_media_type' });
    }
    let entry: LogEntry | null;
    try { entry = validateEntry(await readJson(request)); }
    catch (error) {
      return respond(error instanceof BodyLimit ? 413 : 400,
        { ok: false, code: error instanceof BodyLimit ? 'payload_too_large' : 'invalid_payload' });
    }
    if (!entry) return respond(400, { ok: false, code: 'invalid_payload' });
    const base = supabaseBase(env);
    const key = env['SUPABASE_SERVICE_ROLE_KEY'];
    const salt = env['LOG_IP_HASH_SECRET'];
    if (!base || !key || !salt || salt.length < 32) return respond(503, { ok: false, code: 'unavailable' }, 30);
    // Vercel overwrites this header. Do not deploy behind an untrusted proxy forwarding it unchanged.
    const ipHeader = request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || '';
    if (production && !isIP(ipHeader)) return respond(503, { ok: false, code: 'unavailable' }, 30);
    const ip = isIP(ipHeader) ? ipHeader : 'local';
    const ipHash = createHmac('sha256', salt).update(`${Math.floor(now() / 3_600_000)}:${ip}`).digest('hex');
    if (env['VERCEL_GIT_COMMIT_SHA']) entry.context.release = redact(env['VERCEL_GIT_COMMIT_SHA'], 100);
    const fingerprint = createHash('sha256').update(JSON.stringify([
      entry.context.eventKey, entry.context.route, entry.message,
    ])).digest('hex');
    async function rpc<T>(name: string, payload: object): Promise<T> {
      const response = await fetcher(`${base}/rest/v1/rpc/${name}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Log store unavailable');
      return await response.json() as T;
    }
    let leaseToken: string | undefined;
    try {
      const stored = await rpc<RpcResult>('ingest_application_log', { p_entry: entry, p_ip_hash: ipHash, p_fingerprint: fingerprint });
      if (stored.status === 'rate_limited') return respond(429, { ok: false, code: 'rate_limited' }, 60);
      if (!stored.entry) throw new Error('Invalid store response');
      entry = stored.entry; // Retries always use the original, immutable, sanitized payload.
      if (entry.level !== 'critical') return respond(200, { ok: true, id: entry.id, status: 'stored' });
      const claim = await rpc<RpcResult>('claim_application_log_alert', { p_id: entry.id, p_lease_token: randomUUID() });
      if (claim.status === 'sent' || claim.status === 'suppressed') {
        return respond(200, { ok: true, id: entry.id, status: claim.status });
      }
      if (claim.status !== 'claimed' || !claim.leaseToken) return respond(503, { ok: false, code: 'alert_pending', id: entry.id }, 30);
      leaseToken = claim.leaseToken;
      const token = env['TELEGRAM_BOT_TOKEN'];
      const chatId = env['TELEGRAM_CHAT_ID'];
      if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token) || !chatId || !/^-?\d+$/.test(chatId)) {
        throw new Error('Alert transport unavailable');
      }
      const telegram = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: telegramText(entry),
          link_preview_options: { is_disabled: true }, protect_content: true }),
      });
      if (!telegram.ok || (await telegram.json() as { ok?: boolean }).ok !== true) throw new Error('Alert delivery failed');
      const completed = await rpc<boolean>('finish_application_log_alert', { p_id: entry.id, p_lease_token: leaseToken, p_sent: true });
      if (!completed) throw new Error('Alert acknowledgment failed');
      return respond(200, { ok: true, id: entry.id, status: 'sent' });
    } catch {
      // Never print upstream errors: Telegram URLs contain credentials. Keep the persisted entry retryable.
      if (leaseToken) {
        try { await rpc('finish_application_log_alert', { p_id: entry.id, p_lease_token: leaseToken, p_sent: false }); }
        catch { /* The database lease expires and a subsequent retry can reclaim it. */ }
      }
      return respond(503, { ok: false, code: 'alert_pending', id: entry.id }, 30);
    }
  };
}
