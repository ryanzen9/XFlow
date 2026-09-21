export const PROVIDER_IDS = ["openrouter", "vercel-ai-gateway", "typesafe"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  shortLabel: string;
  modelId: string;
  keyUrl: string;
  keyPlaceholder: string;
}

export interface ProviderSecrets {
  openrouter: string;
  "vercel-ai-gateway": string;
  typesafe: string;
}

export interface ProviderSummary extends ProviderDefinition {
  configured: boolean;
  keyHint: string;
  active: boolean;
}

export const DEFAULT_PROVIDER: ProviderId = "openrouter";
export const PROVIDER_SECRETS_KEY = "providerSecrets";

export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    shortLabel: "OpenRouter",
    modelId: "typesafe/jev-1.13",
    keyUrl: "https://openrouter.ai/settings/keys",
    keyPlaceholder: "sk-or-v1-…",
  },
  "vercel-ai-gateway": {
    id: "vercel-ai-gateway",
    label: "Vercel AI Gateway",
    shortLabel: "Vercel",
    modelId: "typesafe-ai/jev",
    keyUrl: "https://vercel.com/ai-gateway",
    keyPlaceholder: "输入 AI Gateway API Key",
  },
  typesafe: {
    id: "typesafe",
    label: "TypeSafe 官方",
    shortLabel: "TypeSafe",
    modelId: "jev-latest",
    keyUrl: "https://console.typesafe.ai",
    keyPlaceholder: "输入 TypeSafe API Key",
  },
};

export function normalizeProviderId(value: unknown): ProviderId {
  return PROVIDER_IDS.includes(value as ProviderId) ? (value as ProviderId) : DEFAULT_PROVIDER;
}

export function normalizeProviderSecrets(value: unknown): ProviderSecrets {
  const input = value && typeof value === "object" ? (value as Partial<ProviderSecrets>) : {};
  return {
    openrouter: typeof input.openrouter === "string" ? input.openrouter.trim() : "",
    "vercel-ai-gateway": typeof input["vercel-ai-gateway"] === "string" ? input["vercel-ai-gateway"].trim() : "",
    typesafe: typeof input.typesafe === "string" ? input.typesafe.trim() : "",
  };
}

export function providerKeyHint(apiKey: string): string {
  if (!apiKey) return "";
  const suffix = apiKey.slice(-4);
  return `•••• ${suffix}`;
}
