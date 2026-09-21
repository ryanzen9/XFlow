import { TypeSafeClient, noul } from "@typesafe-ai/sdk";
import { PROVIDERS } from "../../../shared";
import type { JevProvider } from "../types";

export function createTypeSafeProvider(providerFetch?: typeof fetch): JevProvider {
  return {
    id: "typesafe",
    modelId: PROVIDERS.typesafe.modelId,
    async evaluate(request, apiKey) {
      const client = new TypeSafeClient({
        apiKey,
        dangerouslyAllowBrowser: true,
        logLevel: "off",
        fetch: providerFetch,
      });
      const response = await client.systemOne({
        model: PROVIDERS.typesafe.modelId,
        state: request.state,
        questions: Object.fromEntries(
          Object.entries(request.questions).map(([id, question]) => [
            id,
            noul(question.instructions, question.criteria),
          ]),
        ),
      });
      return Object.fromEntries(Object.entries(response.answers).map(([id, answer]) => [id, answer.noul]));
    },
  };
}

export const typeSafeProvider = createTypeSafeProvider();
