import type { ProviderId } from "../../shared";

export type JevJsonValue = string | number | boolean | null | JevJsonValue[] | { [key: string]: JevJsonValue };

export interface JevQuestion {
  instructions: string;
  criteria: {
    true: string;
    false: string;
  };
}

export interface JevDecisionRequest {
  state: Record<string, JevJsonValue>;
  questions: Record<string, JevQuestion>;
}

export interface JevProvider {
  id: ProviderId;
  modelId: string;
  evaluate(request: JevDecisionRequest, apiKey: string): Promise<Record<string, number>>;
}
