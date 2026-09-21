import type { ProviderId } from "../../shared";
import { openRouterProvider } from "./providers/openrouter";
import { typeSafeProvider } from "./providers/typesafe";
import { vercelAiGatewayProvider } from "./providers/vercel-ai-gateway";
import type { JevProvider } from "./types";

const registry: Record<ProviderId, JevProvider> = {
  openrouter: openRouterProvider,
  "vercel-ai-gateway": vercelAiGatewayProvider,
  typesafe: typeSafeProvider,
};

export function getJevProvider(id: ProviderId): JevProvider {
  return registry[id];
}
