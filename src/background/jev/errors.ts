import { PROVIDERS, type ProviderId } from "../../shared";

function errorStatus(error: unknown): unknown {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { statusCode?: unknown; status?: unknown };
  return candidate.statusCode ?? candidate.status;
}

export function readableProviderError(providerId: ProviderId, error: unknown): string {
  const provider = PROVIDERS[providerId].label;
  const status = errorStatus(error);
  if (status === 401 || status === 403) return `${provider} API Key 无效或无权访问 Jev。`;
  if (status === 402) return `${provider} 余额不足或计费未启用。`;
  if (status === 429) return `${provider} 请求过于频繁，请稍后再试。`;
  return `${provider} 请求失败，请稍后重试。`;
}
