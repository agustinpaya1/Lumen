/**
 * Pure step-sequencing logic for the guided tour, split out of TourService so
 * it can be unit-tested without a DOM or Router. The rest of the service is a
 * DOM/router controller validated by the TC016–TC020 E2E suite instead.
 */

/** Whether `index` is the final step in a tour of `totalSteps` steps. */
export function isLastTourStep(index: number, totalSteps: number): boolean {
  return index >= totalSteps - 1;
}

/** Index to advance to from `index`, or null when the tour should end. */
export function nextTourIndex(index: number, totalSteps: number): number | null {
  return isLastTourStep(index, totalSteps) ? null : index + 1;
}
