import { describe, expect, it } from 'vitest';
import { isLastTourStep, nextTourIndex } from './tour-sequence';

describe('isLastTourStep', () => {
  it('is false before the final index', () => {
    expect(isLastTourStep(0, 6)).toBe(false);
    expect(isLastTourStep(4, 6)).toBe(false);
  });

  it('is true at the final index', () => {
    expect(isLastTourStep(5, 6)).toBe(true);
  });

  it('treats a single-step tour as immediately last', () => {
    expect(isLastTourStep(0, 1)).toBe(true);
  });
});

describe('nextTourIndex', () => {
  it('advances by one before the final step', () => {
    expect(nextTourIndex(0, 6)).toBe(1);
    expect(nextTourIndex(4, 6)).toBe(5);
  });

  it('returns null once the tour has reached its final step', () => {
    expect(nextTourIndex(5, 6)).toBeNull();
  });

  it('returns null for a single-step tour', () => {
    expect(nextTourIndex(0, 1)).toBeNull();
  });
});
