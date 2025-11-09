/**
 * LM Studio DTOs
 *
 * These DTOs mirror the Gemini DTO shapes used elsewhere in the codebase so that
 * controllers/services can share request validation logic while routing to different providers.
 *
 * LM Studio commonly exposes OpenAI-compatible endpoints (e.g., /v1/chat/completions),
 * but at the NestJS boundary we keep the payloads consistent with our existing Gemini shapes.
 */

/**
 * A single chat message used to build conversational context for LM Studio.
 * Roles align with the front-end and Gemini DTOs to keep a unified contract.
 */
export type LmChatMessageDto = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

/**
 * Chat request payload for LM Studio.
 *
 * - prompt: optional latest user prompt (if omitted, the service may derive it from messages)
 * - messages: prior conversation context
 * - model: optional model name (LM Studio serves local models; leave blank to use backend default)
 * - systemInstruction: optional system prompt to guide responses
 */
export type LmChatRequestDto = {
  prompt?: string;
  messages?: LmChatMessageDto[];
  model?: string;
  systemInstruction?: string;
};

/**
 * Text generation payload (prompt-only) for LM Studio.
 *
 * Matches Gemini's TextDto shape for consistency across providers.
 */
export type LmTextDto = {
  prompt: string;
  model?: string;
  systemInstruction?: string;
};

/**
 * Mixed-media prompt payload (used for file + optional prompt flows) for LM Studio.
 *
 * Matches Gemini's PromptDto shape for consistency across providers.
 * For uploads, the controller/service will build a parts array from the incoming file(s)
 * and combine with `prompt` if present.
 */
export type LmPromptDto = {
  prompt?: string;
  model?: string;
  systemInstruction?: string;
};

/**
 * Barrel exports for convenience when importing LM Studio DTOs.
 */
export type {
  LmChatMessageDto as ChatMessageDto,
  LmChatRequestDto as ChatRequestDto,
  LmTextDto as TextDto,
  LmPromptDto as PromptDto,
};
