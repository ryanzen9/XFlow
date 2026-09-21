export function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function probabilityFromAnswer(answer: unknown): number {
  if (!answer || typeof answer !== "object") return 0;

  const candidate = answer as { type?: unknown; noul?: unknown };
  if (candidate.type !== "noul" || typeof candidate.noul !== "number") return 0;
  return clampProbability(candidate.noul);
}

export function formatProbability(value: number): string {
  return `${Math.round(clampProbability(value) * 100)}%`;
}
