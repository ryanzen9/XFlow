import { PROVIDERS, probabilityFromAnswer } from "../../../shared";
import type { JevProvider } from "../types";

export const openRouterProvider: JevProvider = {
  id: "openrouter",
  modelId: PROVIDERS.openrouter.modelId,
  async evaluate(request, apiKey) {
    const { OpenRouter } = await import("@openrouter/sdk");
    const client = new OpenRouter({ apiKey });
    const response = await client.alpha.decisions.create({
      decisionsRequest: {
        model: PROVIDERS.openrouter.modelId,
        state: request.state,
        questions: Object.fromEntries(
          Object.entries(request.questions).map(([id, question]) => [id, { type: "noul" as const, ...question }]),
        ),
      },
    });
    return Object.fromEntries(
      Object.keys(request.questions).map((id) => [id, probabilityFromAnswer(response.answers[id])]),
    );
  },
};
