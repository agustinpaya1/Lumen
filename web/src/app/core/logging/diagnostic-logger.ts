export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'critical'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  details: unknown[];
  context: {
    eventKey: string;
    route: string;
    sessionId: string;
    online: boolean;
    release: string;
  };
  breadcrumbs: { timestamp: string; level: LogLevel; message: string }[];
}

export interface LoggerOptions {
  production: boolean;
  remoteEnabled?: boolean;
  release?: string;
}

const QUEUE_KEY = 'lumen:logs:pending:v1';
const MAX_PENDING = 30;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_KEY = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
const PRIVATE_KEY = /token|secret|password|authorization|cookie|email|dedication|caption|photo|blob|file|device|user|pin|url|path/i;

/** Best-effort redaction, in addition to only logging operational data at call sites. */
export function redactLogText(value: string, limit = 1000): string {
  return value
    .replace(/data:[^\s]+/gi, '[data]')
    .replace(/https?:\/\/[^\s)]+/gi, '[url]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[token]')
    .replace(/\b\d{5,}:[A-Za-z0-9_-]{20,}\b/g, '[bot-token]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\b(token|secret|password|authorization|cookie|apikey|api_key|pin)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .slice(0, limit);
}

export function sanitizeLogDetails(details: unknown[]): unknown[] {
  const seen = new WeakSet<object>();
  const clean = (value: unknown, depth: number): unknown => {
    if (typeof value === 'string') return redactLogText(value);
    if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value !== 'object') return `[${typeof value}]`;
    if (seen.has(value)) return '[circular]';
    if (depth > 3) return '[truncated]';
    seen.add(value);
    if (typeof Blob !== 'undefined' && value instanceof Blob) return '[binary]';
    if (value instanceof Error) {
      return {
        name: redactLogText(value.name, 80),
        message: redactLogText(value.message),
        stack: redactLogText(value.stack ?? '', 1800),
        ...('cause' in value ? { cause: clean(value.cause, depth + 1) } : {}),
      };
    }
    if (Array.isArray(value)) return value.slice(0, 10).map(item => clean(item, depth + 1));
    return Object.fromEntries(Object.keys(value).slice(0, 12).map(key => [
      redactLogText(key, 80),
      PRIVATE_KEY.test(key) ? '[redacted]' : clean((value as Record<string, unknown>)[key], depth + 1),
    ]));
  };
  try {
    const result = details.slice(0, 5).map(value => clean(value, 0));
    // Preserve a useful summary without ever exceeding the transport budget.
    if (JSON.stringify(result).length <= 6000) return result;
    // Serializing a JSON string escapes its quotes/backslashes again. Budget
    // the final serialized representation, including this second escaping.
    const summary = JSON.stringify(result).slice(0, 2400);
    return [summary];
  } catch {
    return ['[unreadable details]'];
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value & 3) | 8).toString(16);
  });
}

/** Independent of Angular/auth/storage services, including during bootstrap failures. */
export class DiagnosticLogger {
  private readonly sessionId = uuid();
  private readonly remoteEnabled: boolean;
  private readonly recent: LogEntry[] = [];
  private pending: LogEntry[] = [];
  private sending: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 2000;
  private disposed = false;
  private activeRequest: AbortController | null = null;
  private readonly onOnline = () => {
    this.cancelRetry();
    void this.flush();
  };

  constructor(private readonly options: LoggerOptions) {
    this.remoteEnabled = options.remoteEnabled ?? options.production;
    if (this.remoteEnabled && typeof window !== 'undefined') {
      this.restorePending();
      window.addEventListener('online', this.onOnline);
      void this.flush();
    }
  }

  debug(message: string, ...details: unknown[]): void { this.log('debug', message, details); }
  info(message: string, ...details: unknown[]): void { this.log('info', message, details); }
  warn(message: string, ...details: unknown[]): void { this.log('warn', message, details); }
  error(message: string, ...details: unknown[]): void { this.log('error', message, details); }
  critical(message: string, ...details: unknown[]): void { this.log('critical', message, details); }

  getRecentEntries(): readonly LogEntry[] {
    return JSON.parse(JSON.stringify(this.recent)) as LogEntry[];
  }

  private log(level: LogLevel, message: string, details: unknown[]): void {
    if (this.disposed) return;
    // Diagnostics must never turn a recoverable application failure into a crash.
    try {
      const entry: LogEntry = {
        id: uuid(), timestamp: new Date().toISOString(), level,
        message: redactLogText(message, 300), details: sanitizeLogDetails(details),
        context: this.context(),
        breadcrumbs: level === 'critical'
          ? this.recent.slice(-15).map(({ timestamp, level, message }) => ({ timestamp, level, message }))
          : [],
      };
      this.recent.push(entry);
      if (this.recent.length > 100) this.recent.shift();
      if (!this.options.production || LOG_LEVELS.indexOf(level) >= 2) {
        const method = level === 'critical' ? 'error' : level;
        console[method](`[${level.toUpperCase()}] ${entry.message}`, entry);
      }
      if (!this.remoteEnabled || LOG_LEVELS.indexOf(level) < 2) return;
      if (this.pending.length >= MAX_PENDING) {
        let lowest = 0;
        for (let index = 1; index < this.pending.length; index++) {
          if (LOG_LEVELS.indexOf(this.pending[index].level) < LOG_LEVELS.indexOf(this.pending[lowest].level)) lowest = index;
        }
        if (LOG_LEVELS.indexOf(this.pending[lowest].level) > LOG_LEVELS.indexOf(level)) return;
        this.pending.splice(lowest, 1);
      }
      this.pending.push(entry);
      this.persistPending();
      if (!this.retryTimer) void this.flush();
    } catch { /* Logging is strictly best effort. */ }
  }

  /** Resolves even if reporting fails; retries keep the same incident UUID. */
  flush(): Promise<void> {
    if (this.sending) return this.sending;
    if (this.disposed || !this.remoteEnabled || !this.pending.length || !this.isOnline()) {
      return Promise.resolve();
    }
    this.cancelRetry();
    this.sending = this.drain().finally(() => { this.sending = null; });
    return this.sending;
  }

  dispose(): void {
    this.disposed = true;
    this.cancelRetry();
    this.activeRequest?.abort();
    if (typeof window !== 'undefined') window.removeEventListener('online', this.onOnline);
  }

  private async drain(): Promise<void> {
    while (this.pending.length && this.isOnline() && !this.disposed) {
      this.pending = this.pending.filter(entry => Date.now() - Date.parse(entry.timestamp) < MAX_AGE_MS);
      // A flood of recoverable warnings must not delay a fatal incident.
      this.pending.sort((a, b) => LOG_LEVELS.indexOf(b.level) - LOG_LEVELS.indexOf(a.level));
      const entry = this.pending[0];
      if (!entry) { this.persistPending(); return; }
      const controller = new AbortController();
      this.activeRequest = controller;
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch('/api/logs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: this.serializeForTransport(entry), signal: controller.signal,
          credentials: 'omit', keepalive: true,
        });
        // A SPA fallback can respond with 200 HTML: never treat it as receipt.
        const receipt = response.ok ? await response.json() as { ok?: boolean; id?: string } : null;
        if (response.ok && receipt?.ok === true && receipt.id === entry.id) {
          this.pending = this.pending.filter(item => item.id !== entry.id);
          this.retryDelay = 2000;
          this.persistPending();
          continue;
        }
        if ([400, 413, 415].includes(response.status)) {
          // Invalid entries cannot recover by retrying; avoid a poison queue.
          this.pending = this.pending.filter(item => item.id !== entry.id);
          this.persistPending();
          continue;
        }
        const retryAfter = Number(response.headers.get('Retry-After')) * 1000;
        this.scheduleRetry(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : this.retryDelay);
        return;
      } catch {
        this.scheduleRetry(this.retryDelay);
        return;
      } finally {
        clearTimeout(timeout);
        this.activeRequest = null;
      }
    }
  }

  private scheduleRetry(delay: number): void {
    if (this.disposed || this.retryTimer) return;
    this.retryDelay = Math.min(this.retryDelay * 2, 60000);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flush();
    }, Math.max(2000, Math.min(delay, 300000)));
  }

  private serializeForTransport(entry: LogEntry): string {
    const payload = { ...entry, breadcrumbs: [...entry.breadcrumbs] };
    let body = JSON.stringify(payload);
    const bytes = (value: string) => new TextEncoder().encode(value).byteLength;
    // Leave room below the server's 32 KiB cap for jsonb formatting. JS string
    // length alone undercounts emoji/non-Latin text on the wire.
    while (bytes(body) > 28000 && payload.breadcrumbs.length) {
      payload.breadcrumbs.shift();
      body = JSON.stringify(payload);
    }
    if (bytes(body) > 28000) {
      payload.details = ['[Details truncated to fit the transport limit]'];
      body = JSON.stringify(payload);
    }
    return body;
  }

  private cancelRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private isOnline(): boolean { return typeof navigator === 'undefined' || navigator.onLine; }

  private context(): LogEntry['context'] {
    let eventKey = 'demo';
    let route = '/';
    try {
      const requested = new URLSearchParams(window.location.search).get('e');
      const stored = localStorage.getItem('lumen_event_key');
      eventKey = requested && EVENT_KEY.test(requested) ? requested
        : stored && EVENT_KEY.test(stored) ? stored : 'demo';
    } catch { /* Blocked storage must not break crash reporting. */ }
    try {
      const path = window.location.pathname;
      route = ['/', '/home', '/camera', '/admin', '/memories', '/onboarding'].includes(path) ? path : '/other';
    } catch {}
    return {
      eventKey, route, sessionId: this.sessionId, online: this.isOnline(),
      release: redactLogText(this.options.release ?? 'unversioned', 80),
    };
  }

  private persistPending(): void {
    try { sessionStorage.setItem(QUEUE_KEY, JSON.stringify(this.pending)); } catch {}
  }

  private restorePending(): void {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? '[]');
      if (!Array.isArray(saved)) return;
      this.pending = saved.slice(-MAX_PENDING).filter((entry: unknown): entry is LogEntry => {
        if (!entry || typeof entry !== 'object') return false;
        const item = entry as LogEntry;
        return typeof item.id === 'string' && UUID.test(item.id) &&
          ['warn', 'error', 'critical'].includes(item.level) &&
          typeof item.message === 'string' && typeof item.timestamp === 'string' &&
          Number.isFinite(Date.parse(item.timestamp)) &&
          Date.parse(item.timestamp) <= Date.now() + 60000 &&
          Date.now() - Date.parse(item.timestamp) < MAX_AGE_MS &&
          !!item.context && typeof item.context.eventKey === 'string' &&
          EVENT_KEY.test(item.context.eventKey) && UUID.test(item.context.sessionId) &&
          Array.isArray(item.details) && Array.isArray(item.breadcrumbs);
      }).map(item => ({
        id: item.id, timestamp: item.timestamp, level: item.level,
        message: redactLogText(item.message, 300), details: sanitizeLogDetails(item.details),
        context: {
          eventKey: item.context.eventKey, sessionId: item.context.sessionId,
          route: /^\/(home|camera|admin|memories|onboarding|other)?$/.test(item.context.route) ? item.context.route : '/other',
          release: redactLogText(String(item.context.release), 80), online: !!item.context.online,
        },
        breadcrumbs: item.breadcrumbs.slice(-15).filter(crumb =>
          crumb && LOG_LEVELS.includes(crumb.level) && typeof crumb.timestamp === 'string' &&
          Number.isFinite(Date.parse(crumb.timestamp)) && typeof crumb.message === 'string',
        ).map(crumb => ({ timestamp: crumb.timestamp, level: crumb.level, message: redactLogText(crumb.message, 300) })),
      }));
    } catch { this.pending = []; }
  }
}
