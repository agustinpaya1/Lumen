import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiagnosticLogger, sanitizeLogDetails } from './diagnostic-logger';

describe('DiagnosticLogger', () => {
  const loggers: DiagnosticLogger[] = [];
  const makeLogger = (production = true, remoteEnabled = true) => {
    const logger = new DiagnosticLogger({ production, remoteEnabled });
    loggers.push(logger);
    return logger;
  };
  const online = (value: boolean) => vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value);
  const receipt = (_input: unknown, init?: RequestInit) => {
    const entry = JSON.parse(String(init?.body));
    return Promise.resolve(new Response(JSON.stringify({ ok: true, id: entry.id, status: 'stored' })));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    localStorage.clear();
    for (const method of ['debug', 'info', 'warn', 'error'] as const) vi.spyOn(console, method).mockImplementation(() => {});
    online(true);
    vi.stubGlobal('fetch', vi.fn(receipt));
  });

  afterEach(() => {
    loggers.splice(0).forEach(logger => logger.dispose());
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps debug/info breadcrumbs and reports warn+ in production', async () => {
    const logger = makeLogger();
    logger.debug('Camera constraints chosen');
    logger.info('Upload started');
    expect(fetch).not.toHaveBeenCalled();
    logger.critical('Photo could not be saved', new Error('Storage unavailable'));
    await logger.flush();
    const entry = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(entry.level).toBe('critical');
    expect(entry.context).toMatchObject({ eventKey: 'demo', online: true });
    expect(entry.breadcrumbs.map((item: { level: string }) => item.level)).toEqual(['debug', 'info']);
    expect(entry.details[0].message).toBe('Storage unavailable');
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });

  it('has no remote network traffic in development by default', async () => {
    const logger = new DiagnosticLogger({ production: false });
    loggers.push(logger);
    logger.critical('Development failure');
    await logger.flush();
    expect(fetch).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('preserves incident ID through Telegram failures and obeys Retry-After', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 503, headers: { 'Retry-After': '30' } }));
    const logger = makeLogger();
    logger.critical('Persistence unavailable');
    await logger.flush();
    expect(JSON.parse(sessionStorage.getItem('lumen:logs:pending:v1')!)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(29999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(fetch).mock.calls.map(call => JSON.parse(call[1]?.body as string));
    expect(calls[0].id).toBe(calls[1].id);
    expect(JSON.parse(sessionStorage.getItem('lumen:logs:pending:v1')!)).toEqual([]);
  });

  it('retains incidents when the SPA fallback returns HTML with status 200', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('<html>SPA</html>', { status: 200 }));
    const logger = makeLogger();
    logger.critical('Bootstrap failed');
    await expect(logger.flush()).resolves.toBeUndefined();
    expect(JSON.parse(sessionStorage.getItem('lumen:logs:pending:v1')!)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('survives a tab reload offline and delivers the same incident after reconnecting', async () => {
    online(false);
    const first = makeLogger();
    first.critical('Startup failed before authentication');
    const incidentId = first.getRecentEntries()[0].id;
    first.dispose();
    const restored = makeLogger();
    expect(fetch).not.toHaveBeenCalled();
    online(true);
    window.dispatchEvent(new Event('online'));
    await restored.flush();
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string).id).toBe(incidentId);
  });

  it('bounds its queue and gives critical incidents priority over warnings', async () => {
    online(false);
    const logger = makeLogger();
    for (let i = 0; i < 40; i++) logger.warn(`Recoverable ${i}`);
    logger.critical('Cannot save photo');
    const pending = JSON.parse(sessionStorage.getItem('lumen:logs:pending:v1')!);
    expect(pending).toHaveLength(30);
    online(true);
    await logger.flush();
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string).level).toBe('critical');
    expect(fetch).toHaveBeenCalledTimes(30);
  });

  it('evicts a lower-severity warning instead of an older critical incident when full', async () => {
    online(false);
    const logger = makeLogger();
    logger.critical('Original incident');
    for (let i = 0; i < 29; i++) logger.warn(`Warning ${i}`);
    logger.critical('New incident');
    const pending = JSON.parse(sessionStorage.getItem('lumen:logs:pending:v1')!);
    expect(pending).toHaveLength(30);
    expect(pending.filter((entry: { level: string }) => entry.level === 'critical')).toHaveLength(2);
    expect(pending.some((entry: { message: string }) => entry.message === 'Original incident')).toBe(true);
  });

  it('ignores stale/corrupt persisted queues and blocked storage without throwing', async () => {
    sessionStorage.setItem('lumen:logs:pending:v1', '{broken');
    expect(() => makeLogger()).not.toThrow();
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    const logger = makeLogger();
    expect(() => logger.error('No storage')).not.toThrow();
    await logger.flush();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('expires persisted incidents after 24 hours', async () => {
    online(false);
    const first = makeLogger();
    first.critical('Old failure');
    first.dispose();
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);
    online(true);
    const restored = makeLogger();
    await restored.flush();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('drops malformed payloads so they cannot permanently block later incidents', async () => {
    online(false);
    const logger = makeLogger();
    logger.critical('First');
    logger.critical('Second');
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 400 }));
    online(true);
    await logger.flush();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(sessionStorage.getItem('lumen:logs:pending:v1')!)).toEqual([]);
  });

  it('never reports a transport failure recursively', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network down'));
    const logger = makeLogger();
    logger.error('Gallery unavailable');
    await expect(logger.flush()).resolves.toBeUndefined();
    expect(logger.getRecentEntries()).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('redacts sensitive fields and handles cycles, binary data and hostile getters', () => {
    const circular: Record<string, unknown> = { code: 'storage_unavailable', token: 'supersecret', dedication: 'private wedding message' };
    circular['self'] = circular;
    const details = sanitizeLogDetails([circular, new Error('https://example.com/photo?token=secret guest@example.com Bearer SECRET'), new Blob(['photo'])]);
    const json = JSON.stringify(details);
    expect(json).toContain('storage_unavailable');
    expect(json).not.toMatch(/supersecret|private wedding message|example\.com|SECRET/);
    expect(json).toContain('[circular]');
    expect(json).toContain('[binary]');
    expect(sanitizeLogDetails([{ get message() { throw new Error('getter'); } }])).toEqual(['[unreadable details]']);
  });

  it('budgets the final JSON size even when error details contain many quotes and escapes', () => {
    const details = sanitizeLogDetails([new Error('"\\'.repeat(1000)), new Error('"\\'.repeat(1000))]);
    expect(JSON.stringify(details).length).toBeLessThanOrEqual(6000);
  });

  it('keeps large multibyte critical reports below the server byte limit', async () => {
    const logger = makeLogger();
    for (let i = 0; i < 15; i++) logger.info('漢'.repeat(300));
    logger.critical('保存失敗', Array.from({ length: 6 }, () => '漢'.repeat(950)));
    await logger.flush();
    const body = vi.mocked(fetch).mock.calls[0][1]?.body as string;
    expect(new TextEncoder().encode(body).byteLength).toBeLessThanOrEqual(28000);
    expect(JSON.parse(body).level).toBe('critical');
    expect(JSON.parse(body).message).toBe('保存失敗');
  });
});
