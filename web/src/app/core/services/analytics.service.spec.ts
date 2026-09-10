import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  it('emits the privacy-safe analytics contract', () => {
    const listener = vi.fn();
    window.addEventListener('lumen:analytics', listener);

    new AnalyticsService().track('home_view', {
      viewportWidth: 390,
      online: false,
      hasPhotos: true,
    });

    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      name: 'home_view',
      properties: { viewportWidth: 390, online: false, hasPhotos: true },
    });
    window.removeEventListener('lumen:analytics', listener);
  });
});
