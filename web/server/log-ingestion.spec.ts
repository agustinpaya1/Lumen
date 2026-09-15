// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createLogHandler, LogEntry, redact, telegramText, validateEntry } from './log-ingestion';

const ID = '10000000-0000-4000-8000-000000000001';
const LEASE = '20000000-0000-4000-8000-000000000001';
const env = {
  NODE_ENV: 'production', LOG_ALLOWED_ORIGINS: 'https://lumen.example',
  SUPABASE_URL: 'https://project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'server-secret',
  LOG_IP_HASH_SECRET: 'a-test-only-secret-at-least-32-characters',
  TELEGRAM_BOT_TOKEN: '123456:test_token', TELEGRAM_CHAT_ID: '-123456',
};
const fixture = (level: LogEntry['level'] = 'critical'): LogEntry => ({
  id: ID, timestamp: '2026-09-12T10:00:00.000Z', level, message: 'La subida falló',
  details: [{ name: 'UploadError', message: 'Storage unavailable', status: 503 }],
  context: { eventKey: 'boda-demo', route: '/camera', sessionId: LEASE, online: true, release: 'unversioned' },
  breadcrumbs: [{ timestamp: '2026-09-12T09:59:59.000Z', level: 'info', message: 'Foto en cola' }],
});
function request(payload: unknown = fixture(), headers: Record<string, string> = {}, method = 'POST') {
  return new Request('https://lumen.example/api/logs', {
    method, headers: { Origin: 'https://lumen.example', 'Content-Type': 'application/json',
      'x-vercel-forwarded-for': '203.0.113.10', ...headers },
    ...(method === 'POST' ? { body: typeof payload === 'string' ? payload : JSON.stringify(payload) } : {}),
  });
}
function mockBackend({ telegramOk = true, claimStatus = 'claimed', storeFailure = false } = {}) {
  const persisted = new Map<string, LogEntry>();
  const events: string[] = [];
  let sent = false;
  let success = telegramOk;
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const name = String(url).split('/').pop()!;
    const body = JSON.parse(String(init?.body));
    events.push(name);
    if (name === 'ingest_application_log') {
      if (storeFailure) return Response.json({ message: 'private upstream details' }, { status: 500 });
      if (!persisted.has(body.p_entry.id)) persisted.set(body.p_entry.id, body.p_entry);
      return Response.json({ status: 'stored', entry: persisted.get(body.p_entry.id) });
    }
    if (name === 'claim_application_log_alert') return Response.json({ status: sent ? 'sent' : claimStatus, leaseToken: LEASE });
    if (name === 'sendMessage') return Response.json({ ok: success });
    if (name === 'finish_application_log_alert') {
      sent = body.p_sent;
      return Response.json(true);
    }
    throw new Error('Unexpected request');
  });
  return { fetcher, persisted, events, recover: () => { success = true; } };
}

describe('log ingestion public boundary', () => {
  it.each([
    [{ id: 'not-uuid' }, 400], [{ level: 'debug' }, 400], [{ message: 'x'.repeat(301) }, 400],
    [{ timestamp: 'yesterday' }, 400], [{ details: ['x'.repeat(6000)] }, 400],
    [{ breadcrumbs: Array(16).fill(fixture().breadcrumbs[0]) }, 400],
  ])('rejects malformed payload %o without touching upstream', async (patch, status) => {
    const fetcher = vi.fn();
    const response = await createLogHandler({ env, fetch: fetcher })(request({ ...fixture(), ...patch }));
    expect(response.status).toBe(status);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects oversized streamed bodies, malformed JSON and unsupported media types', async () => {
    const handler = createLogHandler({ env, fetch: vi.fn() });
    expect((await handler(request('x'.repeat(32769)))).status).toBe(413);
    expect((await handler(request('{'))).status).toBe(400);
    expect((await handler(request(fixture(), { 'Content-Type': 'text/plain' }))).status).toBe(415);
    expect((await handler(request({}, {}, 'GET'))).status).toBe(405);
  });
  it('requires configured origins and a trusted Vercel IP in production', async () => {
    const fetcher = vi.fn();
    expect((await createLogHandler({ env, fetch: fetcher })(request(fixture(), { Origin: 'https://attacker.example' }))).status).toBe(403);
    expect((await createLogHandler({ env: { ...env, LOG_ALLOWED_ORIGINS: '' }, fetch: fetcher })(request())).status).toBe(503);
    expect((await createLogHandler({ env, fetch: fetcher })(request(fixture(), { 'x-vercel-forwarded-for': '' }))).status).toBe(503);
    const preflight = await createLogHandler({ env, fetch: fetcher })(request({}, {}, 'OPTIONS'));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('https://lumen.example');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not pretend persistence succeeded when configuration is missing', async () => {
    const response = await createLogHandler({ env: { ...env, SUPABASE_SERVICE_ROLE_KEY: '' }, fetch: vi.fn() })(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, code: 'unavailable' });
    expect(response.headers.get('Retry-After')).toBe('30');
  });
  it('redacts diagnostics, strips arbitrary properties and removes route query secrets before persistence', async () => {
    const backend = mockBackend();
    const entry = fixture('error');
    entry.context.route = '/camera?access_token=secret#email';
    entry.details = [{ message: 'email=jane@example.com token=top-secret https://host/path?secret=abc',
      password: 'hidden', dedication: 'private wedding message', nested: { access_token: 'hidden' } }];
    const response = await createLogHandler({ env, fetch: backend.fetcher })(request(entry));
    expect(response.status).toBe(200);
    const saved = backend.persisted.get(ID)!;
    expect(saved.context.route).toBe('/camera');
    expect(JSON.stringify(saved)).not.toMatch(/jane@|top-secret|hidden|private wedding|host\/path/);
    expect(saved.details).toEqual([{ message: 'email=[email] token=[redacted] [url]' }]);
    expect(validateEntry({ ...entry, context: { ...entry.context, route: '/guest/private-name' } })?.context.route).toBe('/[other]');
  });
  it('redacts common credentials even when they occur in strings', () => {
    const source = 'Bearer abcdef eyJabc.abc.def sb_secret_test 123456:abcdefghijklmnopqrstuvw "password":"hidden value" me@example.org';
    const safe = redact(source, 1200);
    expect(safe).not.toMatch(/abcdef|eyJabc|sb_secret_test|123456:|hidden value|me@/);
  });
  it('uses hourly HMAC hashes and a server release without persisting the raw IP', async () => {
    const backend = mockBackend();
    for (const timestamp of [0, 3_600_000]) {
      await createLogHandler({ env: { ...env, VERCEL_GIT_COMMIT_SHA: 'abc123' }, fetch: backend.fetcher,
        now: () => timestamp })(request(fixture('warn')));
    }
    const payloads = backend.fetcher.mock.calls.filter(([url]) => String(url).endsWith('ingest_application_log'))
      .map(([, init]) => JSON.parse(String(init?.body)));
    expect(payloads[0].p_ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(payloads[0].p_ip_hash).not.toBe(payloads[1].p_ip_hash);
    expect(JSON.stringify(payloads)).not.toContain('203.0.113.10');
    expect(backend.persisted.get(ID)?.context.release).toBe('abc123');
  });
});

describe('persisted Telegram notifications', () => {
  it.each(['warn', 'error'] as const)('stores %s without notifying Telegram', async level => {
    const backend = mockBackend();
    const response = await createLogHandler({ env, fetch: backend.fetcher })(request(fixture(level)));
    expect(await response.json()).toEqual({ ok: true, id: ID, status: 'stored' });
    expect(backend.events).toEqual(['ingest_application_log']);
  });
  it('persists and claims before sending, and retries the same ID without a second notification', async () => {
    const backend = mockBackend();
    const handler = createLogHandler({ env, fetch: backend.fetcher });
    expect(await (await handler(request())).json()).toEqual({ ok: true, id: ID, status: 'sent' });
    expect(backend.events).toEqual(['ingest_application_log', 'claim_application_log_alert', 'sendMessage', 'finish_application_log_alert']);
    expect(await (await handler(request())).json()).toEqual({ ok: true, id: ID, status: 'sent' });
    expect(backend.events.filter(name => name === 'sendMessage')).toHaveLength(1);
    const send = backend.fetcher.mock.calls.find(([url]) => String(url).endsWith('sendMessage'))!;
    const payload = JSON.parse(String(send[1]?.body));
    expect(payload).toMatchObject({ chat_id: '-123456', link_preview_options: { is_disabled: true } });
    expect(payload).not.toHaveProperty('parse_mode');
    expect(payload.text).toContain(ID);
    expect(payload.text.length).toBeLessThan(4096);
  });
  it('keeps delivery retryable after failure and delivers the immutable saved payload on retry', async () => {
    const backend = mockBackend({ telegramOk: false });
    const handler = createLogHandler({ env, fetch: backend.fetcher });
    const failure = await handler(request());
    expect(failure.status).toBe(503);
    expect(await failure.json()).toEqual({ ok: false, code: 'alert_pending', id: ID });
    expect(backend.persisted.size).toBe(1);
    expect(JSON.parse(String(backend.fetcher.mock.calls.at(-1)?.[1]?.body)).p_sent).toBe(false);
    backend.recover();
    const retry = await handler(request({ ...fixture(), message: 'Changed retry payload' }));
    expect(retry.status).toBe(200);
    const send = backend.fetcher.mock.calls.filter(([url]) => String(url).endsWith('sendMessage')).at(-1)!;
    expect(String(send[1]?.body)).not.toContain('Changed retry payload');
  });
  it('persists critical incidents when Telegram is not configured', async () => {
    const backend = mockBackend();
    const response = await createLogHandler({ env: { ...env, TELEGRAM_BOT_TOKEN: '' }, fetch: backend.fetcher })(request());
    expect(response.status).toBe(503);
    expect(backend.persisted.size).toBe(1);
    expect(backend.events).not.toContain('sendMessage');
    expect(backend.events.at(-1)).toBe('finish_application_log_alert');
  });
  it.each(['busy', 'suppressed'])('respects durable claim status %s', async claimStatus => {
    const backend = mockBackend({ claimStatus });
    const response = await createLogHandler({ env, fetch: backend.fetcher })(request());
    expect(response.status).toBe(claimStatus === 'busy' ? 503 : 200);
    expect(backend.events).not.toContain('sendMessage');
  });
  it('returns retry guidance for durable rate limiting', async () => {
    const fetcher = vi.fn(async () => Response.json({ status: 'rate_limited' }));
    const response = await createLogHandler({ env, fetch: fetcher })(request());
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('does not expose upstream details or send Telegram before persistence', async () => {
    const backend = mockBackend({ storeFailure: true });
    const response = await createLogHandler({ env, fetch: backend.fetcher })(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(/private|upstream|secret|supabase/);
    expect(backend.events).toEqual(['ingest_application_log']);
  });
  it('caps Telegram text and keeps the incident ID and latest breadcrumbs', () => {
    const entry = fixture();
    entry.details = ['x'.repeat(5900)];
    entry.breadcrumbs = Array.from({ length: 15 }, (_, i) => ({ timestamp: entry.timestamp, level: 'info', message: `Paso ${i} ${'x'.repeat(280)}` }));
    const text = telegramText(entry);
    expect(text.length).toBeLessThan(4096);
    expect(text).toContain(ID);
    expect(text).toContain('Paso 14');
  });
});
