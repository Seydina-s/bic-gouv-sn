/*
 * The language model behind the assistant, whoever provides it (CLAUDE.md §4.2:
 * interfaces first). Changing provider means writing one adapter; nothing else in
 * the assistant knows which model answers.
 */

export interface LlmRequest {
  /** Fixed rules of the assistant: cacheable by providers that support it. */
  system: string;
  /** The question and the official passages it may use. */
  user: string;
  maxOutputTokens: number;
}

export interface LlmResponse {
  text: string;
  /** Exact model version, kept with each answer for audit and cost. */
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface LlmProvider {
  readonly name: string;
  complete(request: LlmRequest, signal: AbortSignal): Promise<LlmResponse>;
}
