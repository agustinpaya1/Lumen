import { describe, expect, it } from 'vitest';
import { counterColorClass, detectDevicePlatform } from './capture';

describe('detectDevicePlatform', () => {
  const IPHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  const IPAD =
    'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  const ANDROID =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36';
  const DESKTOP =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  it('recognises iPhone', () => {
    expect(detectDevicePlatform(IPHONE)).toBe('ios');
  });

  it('recognises iPad', () => {
    expect(detectDevicePlatform(IPAD)).toBe('ios');
  });

  it('recognises Android', () => {
    expect(detectDevicePlatform(ANDROID)).toBe('android');
  });

  it('treats desktop as unknown', () => {
    expect(detectDevicePlatform(DESKTOP)).toBe('unknown');
  });

  it('is case-insensitive', () => {
    expect(detectDevicePlatform('IPHONE')).toBe('ios');
    expect(detectDevicePlatform('ANDROID')).toBe('android');
  });

  it('prefers iOS when a user agent mentions both', () => {
    // Some in-app browsers stuff several platform tokens into the UA; iOS wins
    // because its permission-recovery instructions differ the most.
    expect(detectDevicePlatform('iPhone; Android')).toBe('ios');
  });

  it('does not throw on an empty user agent', () => {
    expect(detectDevicePlatform('')).toBe('unknown');
  });
});

describe('counterColorClass', () => {
  it('stays neutral while there is slack', () => {
    expect(counterColorClass(10)).toBe('text-white');
    expect(counterColorClass(4)).toBe('text-white');
  });

  it('warns as the quota runs low', () => {
    expect(counterColorClass(3)).toBe('text-yellow-300');
    expect(counterColorClass(2)).toBe('text-yellow-300');
  });

  it('alarms on the last shot and once exhausted', () => {
    expect(counterColorClass(1)).toBe('text-red-400');
    expect(counterColorClass(0)).toBe('text-red-400');
  });

  it('keeps the alarm colour for an out-of-range negative count', () => {
    expect(counterColorClass(-5)).toBe('text-red-400');
  });
});
