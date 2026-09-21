import { describe, expect, test } from "bun:test";
import type { JevDecisionRequest } from "../types";
import { createTypeSafeProvider } from "./typesafe";
import { createVercelAiGatewayProvider } from "./vercel-ai-gateway";

const request: JevDecisionRequest = {
  state: { posts: [{ id: "42", text: "example" }] },
  questions: {
    match: {
      instructions: "Does post 42 match?",
      criteria: { true: "It is promotional.", false: "It is ordinary conversation." },
    },
  },
};

describe("Jev provider adapters", () => {
  test("maps canonical questions to the Vercel AI Gateway evaluation API", async () => {
    let submitted: Record<string, unknown> | undefined;
    let authorization = "";
    const providerFetch = (async (_input, init) => {
      submitted = JSON.parse(String(init?.body));
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      return Response.json({ answers: { match: { type: "boolean", probability: 0.81 } } });
    }) as typeof fetch;

    const result = await createVercelAiGatewayProvider(providerFetch).evaluate(request, "vercel-secret");

    expect(result).toEqual({ match: 0.81 });
    expect(authorization).toBe("Bearer vercel-secret");
    expect(submitted).toMatchObject({
      state: request.state,
      questions: {
        match: {
          type: "boolean",
          instructions: "Does post 42 match?",
          criteria: { true: "It is promotional.", false: "It is ordinary conversation." },
        },
      },
    });
  });

  test("maps canonical questions to the TypeSafe System One SDK", async () => {
    let submitted: Record<string, unknown> | undefined;
    let authorization = "";
    const providerFetch = (async (_input, init) => {
      submitted = JSON.parse(String(init?.body));
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      return Response.json({
        model: "jev-latest",
        answers: { match: { type: "noul", noul: 0.73 } },
        usage: { input_tokens: 10, output_tokens: 2 },
      });
    }) as typeof fetch;

    const result = await createTypeSafeProvider(providerFetch).evaluate(request, "typesafe-secret");

    expect(result).toEqual({ match: 0.73 });
    expect(authorization).toBe("Bearer typesafe-secret");
    expect(submitted).toMatchObject({
      model: "jev-latest",
      state: request.state,
      questions: {
        match: {
          type: "noul",
          instructions: "Does post 42 match?",
          criteria: { true: "It is promotional.", false: "It is ordinary conversation." },
        },
      },
    });
  });
});
