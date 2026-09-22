export const MAX_POST_LENGTH = 4_000;
export const MAX_BATCH_SIZE = 5;

/**
 * Probability a post must reach to be obscured when its review result carries
 * no strategy details. Deliberately separate from the sensitivity seeded into
 * new strategies (`DEFAULT_SENSITIVITY` in `strategy.ts`).
 */
export const FALLBACK_THRESHOLD = 0.8;
