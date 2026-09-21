import { PROVIDERS } from "../../../shared";
import type { JevProvider } from "../types";

export function createVercelAiGatewayProvider(providerFetch?: typeof fetch): JevProvider {
  return {
    id: "vercel-ai-gateway",
    modelId: PROVIDERS["vercel-ai-gateway"].modelId,
    async evaluate(request, apiKey) {
      const { createGateway, experimental_evaluate } = await import("ai");
      const gateway = createGateway({ apiKey, fetch: providerFetch });
      const result = await experimental_evaluate({
        model: gateway.evaluationModel(PROVIDERS["vercel-ai-gateway"].modelId),
        state: request.state,
        questions: Object.fromEntries(
          Object.entries(request.questions).map(([id, question]) => [
            id,
            { type: "boolean" as const, instructions: question.instructions, criteria: question.criteria },
          ]),
        ),
      });
      return Object.fromEntries(Object.entries(result.answers).map(([id, answer]) => [id, answer.probability]));
    },
  };
}

export const vercelAiGatewayProvider = createVercelAiGatewayProvider();
