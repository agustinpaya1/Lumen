import { afterEach, describe, expect, it, vi } from 'vitest';
import { triggerBrowserDownload } from './download';

/**
 * Captures the anchor the util synthesises, so the tests assert on the real
 * element and on real DOM insertion rather than on stubbed-out no-ops.
 */
function captureAnchor() {
  const anchor = document.createElement('a');
  const click = vi.spyOn(anchor, 'click').mockImplementation(() => {});
  vi.spyOn(document, 'createElement').mockReturnValue(anchor);
  return { anchor, click };
}

describe('triggerBrowserDownload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('points the anchor at the url and names the downloaded file', () => {
    const { anchor } = captureAnchor();

    triggerBrowserDownload('blob:abc123', 'foto.jpg');

    expect(anchor.getAttribute('href')).toBe('blob:abc123');
    expect(anchor.download).toBe('foto.jpg');
  });

  it('clicks the anchor — the only thing that actually starts a mobile download', () => {
    const { click } = captureAnchor();

    triggerBrowserDownload('blob:abc123', 'foto.jpg');

    expect(click).toHaveBeenCalledOnce();
  });

  it('sets target when one is given', () => {
    const { anchor } = captureAnchor();

    triggerBrowserDownload('https://cdn.example/foto.jpg', 'foto.jpg', '_blank');

    expect(anchor.target).toBe('_blank');
  });

  it('leaves target unset when omitted', () => {
    const { anchor } = captureAnchor();

    triggerBrowserDownload('blob:abc123', 'foto.jpg');

    expect(anchor.hasAttribute('target')).toBe(false);
  });

  it('removes the anchor from the document again, leaving no residue', () => {
    const { anchor } = captureAnchor();
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');

    triggerBrowserDownload('blob:abc123', 'foto.jpg');

    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(removeChild).toHaveBeenCalledWith(anchor);
    expect(document.body.contains(anchor)).toBe(false);
  });

  it('keeps the anchor out of view while it is attached', () => {
    const { anchor } = captureAnchor();

    triggerBrowserDownload('blob:abc123', 'foto.jpg');

    expect(anchor.style.display).toBe('none');
  });
});
