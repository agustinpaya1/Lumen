/** Mobile platforms that get a tailored camera-permission helper. */
export type DevicePlatform = 'ios' | 'android' | 'unknown';

/**
 * Classifies the user agent to pick the right permission-recovery instructions
 * (Settings → Safari on iOS, site settings on Android).
 *
 * Extracted from CameraComponent: it is a pure string classification with no
 * dependency on the component's media-stream lifecycle, so it is worth testing
 * directly rather than through a mocked getUserMedia.
 */
export function detectDevicePlatform(userAgent: string): DevicePlatform {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'unknown';
}

/**
 * Colour class for the remaining-photos counter: white while there is slack,
 * amber as it runs low, red on the last shot.
 */
export function counterColorClass(remaining: number): string {
  if (remaining > 3) return 'text-white';
  if (remaining > 1) return 'text-yellow-300';
  return 'text-red-400';
}
