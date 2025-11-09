import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { ChatMessageDto, ChatRequestDto } from './dto';

/**
 * LmStudioService
 *
 * Calls a locally running LM Studio server using OpenAI-compatible endpoints.
 * - Default endpoint: POST {LMSTUDIO_BASE_URL}/v1/chat/completions
 * - Optional API key: LMSTUDIO_API_KEY (sent as Bearer token if provided)
 *
 * Notes:
 * - LM Studio models are local; you must have a model loaded and configured.
 * - The `model` field is typically required by the server. Configure `LMSTUDIO_MODEL`
 *   or provide one per request.
 * - Multimodal (image/audio) is generally unsupported by local LLMs; we coerce inline parts
 *   into a text prompt with placeholders when present.
 */
@Injectable()
export class LmStudioService {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly defaultModel?: string;

  constructor() {
    this.baseUrl =
      process.env.LMSTUDIO_BASE_URL?.trim() || 'http://localhost:1234';
    this.apiKey = process.env.LMSTUDIO_API_KEY?.trim() || undefined;
    this.defaultModel = process.env.LMSTUDIO_MODEL?.trim() || undefined;
  }

  /**
   * Chat with LM Studio using OpenAI-compatible /v1/chat/completions endpoint.
   */
  async chat(request: ChatRequestDto) {
    try {
      const modelName = this.resolveModel(request.model);
      const messages = this.composeChatMessages(
        request.messages ?? [],
        request.systemInstruction,
        request.prompt,
      );

      const payload: Record<string, unknown> = {
        model: modelName,
        messages,
        // You can add temperature/top_p etc. here if desired
      };

      const result = await this.postJson('/v1/chat/completions', payload);
      const text = this.extractChatChoiceText(result);
      return { model: modelName, text };
    } catch (err: any) {
      throw new InternalServerErrorException(this.normalizeError(err));
    }
  }

  /**
   * Prompt-only text generation. Internally uses chat completions with a single user message,
   * optionally preceded by a system instruction.
   */
  async generateText(
    prompt: string,
    options: { model?: string; systemInstruction?: string } = {},
  ) {
    try {
      const modelName = this.resolveModel(options.model);
      const messages: Array<{ role: string; content: string }> = [];

      if (options.systemInstruction?.trim()) {
        messages.push({
          role: 'system',
          content: options.systemInstruction.trim(),
        });
      }
      messages.push({ role: 'user', content: prompt });

      const payload: Record<string, unknown> = {
        model: modelName,
        messages,
      };

      const result = await this.postJson('/v1/chat/completions', payload);
      const text = this.extractChatChoiceText(result);
      return { model: modelName, text };
    } catch (err: any) {
      throw new InternalServerErrorException(this.normalizeError(err));
    }
  }

  /**
   * Generate text from mixed inline parts (e.g., file + optional text prompt).
   * Since local LLMs typically do not support native multimodal inputs, this method
   * converts non-text parts into textual placeholders and combines them with any provided prompt.
   */
  async generateFromInlineParts(
    parts: any[],
    options: { model?: string; systemInstruction?: string } = {},
  ) {
    try {
      const modelName = this.resolveModel(options.model);
      const textPrompt = this.coercePartsToText(parts);

      const messages: Array<{ role: string; content: string }> = [];
      if (options.systemInstruction?.trim()) {
        messages.push({
          role: 'system',
          content: options.systemInstruction.trim(),
        });
      }
      messages.push({ role: 'user', content: textPrompt });

      const payload: Record<string, unknown> = {
        model: modelName,
        messages,
      };

      const result = await this.postJson('/v1/chat/completions', payload);
      const text = this.extractChatChoiceText(result);
      return { model: modelName, text };
    } catch (err: any) {
      throw new InternalServerErrorException(this.normalizeError(err));
    }
  }

  /**
   * Helper to build inline data part placeholder in text prompt.
   * LM Studio likely won't accept binary multimodal content via Chat Completions;
   * use placeholders to aid reasoning.
   */
  buildInlineDataPart(buffer: Buffer, mimeType: string) {
    // This mirrors the Gemini service's part structure shape (not used directly by LM Studio).
    const base64 = buffer.toString('base64');
    return { inlineData: { data: base64, mimeType } };
  }

  // -----------------------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------------------

  private resolveModel(model?: string) {
    const chosen = model?.trim() || this.defaultModel;
    if (!chosen) {
      throw new Error(
        'No LM Studio model configured. Provide `model` in the request or set `LMSTUDIO_MODEL` in environment.',
      );
    }
    return chosen;
  }

  private composeChatMessages(
    history: ChatMessageDto[],
    systemInstruction?: string,
    latestPrompt?: string,
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // System instruction first (if any)
    if (systemInstruction?.trim()) {
      messages.push({ role: 'system', content: systemInstruction.trim() });
    }

    // Map prior conversation
    for (const m of history) {
      const content = (m?.content ?? '').trim();
      if (!content) continue;
      const role =
        m.role === 'assistant'
          ? 'assistant'
          : m.role === 'system'
            ? 'system'
            : 'user';
      messages.push({ role, content });
    }

    // Latest prompt (if provided)
    if (latestPrompt?.trim()) {
      messages.push({ role: 'user', content: latestPrompt.trim() });
    }

    // Ensure at least one user message is present
    if (!messages.some((m) => m.role === 'user')) {
      // Derive a user message from the last assistant entry or insert a placeholder
      const last = messages[messages.length - 1];
      if (!last || last.role !== 'user') {
        messages.push({
          role: 'user',
          content: 'Please respond to the conversation above.',
        });
      }
    }

    return messages;
  }

  private coercePartsToText(parts: any[]) {
    const lines: string[] = [];
    for (const p of parts || []) {
      // text part
      if (typeof p?.text === 'string' && p.text.trim()) {
        lines.push(p.text.trim());
        continue;
      }
      // inlineData part (binary payload) -> convert to placeholder
      const mime = p?.inlineData?.mimeType || 'application/octet-stream';
      const bytes =
        typeof p?.inlineData?.data === 'string' ? p.inlineData.data.length : 0;
      lines.push(
        `[Attachment: ${mime}, ${bytes} bytes; content omitted in local text-only mode]`,
      );
    }
    return lines.length ? lines.join('\n\n') : '(no content)';
  }

  private async postJson(path: string, body: unknown) {
    const url = this.composeUrl(path);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    let res: Response;
    try {
      // Node >= 18 provides fetch globally
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } catch (e: any) {
      throw new Error(
        `Failed to reach LM Studio at ${url}. Is the server running and accessible? ${e?.message || e}`,
      );
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      const raw = await res.text().catch(() => '');
      data = { error: raw || 'Unknown LM Studio response format' };
    }

    if (!res.ok) {
      const message =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        `LM Studio error (HTTP ${res.status})`;
      throw new Error(message);
    }

    return data;
  }

  private extractChatChoiceText(result: any) {
    // OpenAI-compatible chat completions shape:
    // { choices: [ { message: { role: 'assistant', content: '...' } } ] }
    const choice = result?.choices?.[0];
    const content = choice?.message?.content;
    if (typeof content === 'string') return content;

    // Some implementations may return an array of content parts {type,text}
    const parts = Array.isArray(content)
      ? content
      : choice?.message?.content?.parts;
    if (Array.isArray(parts)) {
      const text = parts
        .map((p: any) => p?.text || p?.content || '')
        .filter((s: string) => typeof s === 'string' && s.trim())
        .join('\n');
      if (text.trim()) return text;
    }

    // Fallback: try top-level properties
    return (
      result?.output_text ||
      result?.text ||
      result?.choices?.[0]?.text || // completion-style fallback
      ''
    );
  }

  private composeUrl(path: string) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  private normalizeError(err: any) {
    if (typeof err === 'string') return err;
    if (err?.message) return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return 'Unknown error';
    }
  }
}
