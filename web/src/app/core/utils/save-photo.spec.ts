import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoSaver, savePhoto } from './save-photo';
let click: ReturnType<typeof vi.spyOn>;
beforeEach(() => { click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}); });
const blob = new Blob(['photo'], { type: 'image/png' });
function setup(active = true) {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share, canShare: () => true, userActivation: { isActive: active } });
  return share;
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); vi.useRealTimers(); });
describe('savePhoto', () => {
  it('shares a file with matching image type and extension', async () => {
    const share = setup();
    await savePhoto(blob, 'photo.jpg');
    const file = share.mock.calls[0][0].files[0];
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/png');
    expect(file.name).toBe('photo.png');
    expect(file.size).toBe(blob.size);
    expect(click).not.toHaveBeenCalled();
  });
  it('does not download on cancellation', async () => {
    setup().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    expect(await savePhoto(blob, 'photo.jpg')).toBe('');
    expect(click).not.toHaveBeenCalled();
  });
  it('keeps a prepared image for a second tap after activation expires', async () => {
    const first = setup(false);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => blob }));
    const saver = new PhotoSaver();
    expect(await saver.saveUrl('/photo', 'photo.jpg')).toContain('otra vez');
    expect(first).not.toHaveBeenCalled();
    const second = setup();
    await saver.saveUrl('/photo', 'photo.jpg');
    expect(second).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('handles an expired share gesture without downloading', async () => {
    setup().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    expect(await savePhoto(blob, 'photo.jpg')).toContain('otra vez');
    expect(click).not.toHaveBeenCalled();
  });
  it('propagates actual failures for the UI to report', async () => {
    setup().mockRejectedValue(new Error('Failed'));
    await expect(savePhoto(blob, 'photo.jpg')).rejects.toThrow('Failed');
  });
  it.each([
    { userAgent: 'iPhone', platform: 'iPhone' },
    { userAgent: 'Android', platform: 'Linux' },
    { userAgent: 'Safari', platform: 'MacIntel', maxTouchPoints: 5 },
  ])('offers mobile instructions instead of saving to Files: %o', async (navigator) => {
    vi.stubGlobal('navigator', navigator);
    expect(await savePhoto(blob, 'photo.jpg')).toContain('Mantén pulsada');
    expect(click).not.toHaveBeenCalled();
  });
  it('preserves desktop downloads and releases their URL', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { userAgent: 'Desktop', platform: 'Linux' });
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:photo'), revokeObjectURL: vi.fn() });
    await savePhoto(blob, 'photo.jpg');
    expect(click).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
  });
  it('does not cache failed fetches', async () => {
    setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce({ ok: true, blob: async () => blob }));
    const saver = new PhotoSaver();
    await expect(saver.saveUrl('/photo', 'photo.jpg')).rejects.toThrow('503');
    await saver.saveUrl('/photo', 'photo.jpg');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
