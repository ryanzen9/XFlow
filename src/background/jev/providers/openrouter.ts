import { PROVIDERS, probabilityFromAnswer } from "../../../shared";
import type { JevProvider } from "../types";

function isValidNoulAnswer(answer: unknown): boolean {
  if (!answer || typeof answer !== "object") return false;
  const candidate = answer as { type?: unknown; noul?: unknown };
  return candidate.type === "noul" && typeof candidate.noul === "number" && Number.isFinite(candidate.noul);
}

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
      Object.keys(request.questions).flatMap((id) => {
        const answer = response.answers[id];
        return isValidNoulAnswer(answer) ? [[id, probabilityFromAnswer(answer)]] : [];
      }),
    );
  },
};
