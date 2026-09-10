import { Injectable } from '@angular/core';

export type LumenAnalyticsEvent =
  | 'home_view'
  | 'gallery_first_photo_visible'
  | 'capture_tap'
  | 'upload_tap'
  | 'filter_change'
  | 'photo_open'
  | 'share_qr_open'
  | 'share_qr_copy'
  | 'share_native_open'
  | 'recovery_action'
  | 'upload_success';

export type LumenAnalyticsProperties = Readonly<
  Partial<{
    viewportWidth: number;
    online: boolean;
    hasPhotos: boolean;
    filter: 'global' | 'personal';
    source: 'camera' | 'gallery';
    recovery: 'gallery' | 'queue' | 'event';
  }>
>;

/**
 * Privacy-safe browser contract for product analytics.
 * A production sink can listen to `lumen:analytics`; photos, captions and user/device ids
 * are deliberately not accepted by the typed payload.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  track(name: LumenAnalyticsEvent, properties: LumenAnalyticsProperties = {}): void {
    window.dispatchEvent(
      new CustomEvent('lumen:analytics', {
        detail: { name, properties },
      }),
    );
  }
}
