import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { ChatRequestDto, PromptDto, TextDto } from './dto';
import { LmStudioService } from './lmstudio.service';

/**
 * LM Studio Controller
 *
 * Mirrors the Gemini controller's endpoints under the "lm" route prefix and
 * supports provider-based routing semantics:
 * - If a request includes `provider` and it is not "lmstudio", the endpoint rejects the request.
 * - If `provider` is omitted, the controller assumes LM Studio is intended (since it is mounted at /lm).
 *
 * Endpoints:
 * - POST /lm/api/chat
 * - POST /lm/generate-text
 * - POST /lm/generate-from-image
 * - POST /lm/generate-from-document
 * - POST /lm/generate-from-audio
 *
 * Notes:
 * - LM Studio typically exposes OpenAI-compatible endpoints; the service adapts
 *   the incoming payloads to those shapes.
 * - For uploads, LM Studio (local LLMs) are generally text-only. The service will
 *   convert binary parts to textual placeholders for reasoning.
 */
@Controller('lm')
export class LmStudioController {
  constructor(private readonly lmstudio: LmStudioService) {}

  /**
   * Chat with LM Studio (conversational API).
   *
   * Accepts the same payload shape as Gemini's chat endpoint, plus an optional `provider`.
   */
  @Post('api/chat')
  @HttpCode(HttpStatus.OK)
  chatWithLmStudio(@Body() body: ChatRequestDto & { provider?: string }) {
    this.ensureProviderIsLmStudio(body?.provider);

    const { prompt, model, systemInstruction, messages } = body || {};
    const trimmedPrompt = typeof prompt === 'string' ? prompt.trim() : '';

    let effectivePrompt = trimmedPrompt;

    // If no explicit prompt, derive from the last user message in the thread
    if (!effectivePrompt && Array.isArray(messages)) {
      const lastUserMessage = [...messages]
        .reverse()
        .find(
          (message) =>
            message?.role === 'user' && typeof message?.content === 'string',
        );
      if (lastUserMessage?.content) {
        effectivePrompt = lastUserMessage.content.trim();
      }
    }

    if (!effectivePrompt) {
      throw new BadRequestException('prompt is required (string)');
    }

    return this.lmstudio.chat({
      prompt: effectivePrompt,
      model,
      systemInstruction,
      messages: Array.isArray(messages) ? messages : undefined,
    });
  }

  /**
   * Prompt-only text generation via LM Studio.
   */
  @Post('generate-text')
  @HttpCode(HttpStatus.OK)
  generateText(@Body() body: TextDto & { provider?: string }) {
    this.ensureProviderIsLmStudio(body?.provider);

    const { prompt, model, systemInstruction } = body || {};
    if (!prompt || typeof prompt !== 'string') {
      return { error: 'prompt is required (string)' };
    }
    return this.lmstudio.generateText(prompt, { model, systemInstruction });
  }

  /**
   * Generate from an image upload + optional prompt/system instruction.
   * LM Studio treats binary parts as placeholders and reasons over the text.
   */
  @Post('generate-from-image')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    }),
  )
  @HttpCode(HttpStatus.OK)
  generateFromImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: PromptDto & { provider?: string },
  ) {
    this.ensureProviderIsLmStudio(body?.provider);

    const { prompt, model, systemInstruction } = body || {};
    if (!file) return { error: 'image file is required (field: image)' };
    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });
    parts.push(this.lmstudio.buildInlineDataPart(file.buffer, file.mimetype));
    return this.lmstudio.generateFromInlineParts(parts, {
      model,
      systemInstruction,
    });
  }

  /**
   * Generate from a document upload + optional prompt/system instruction.
   */
  @Post('generate-from-document')
  @UseInterceptors(
    FileInterceptor('document', {
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  )
  @HttpCode(HttpStatus.OK)
  generateFromDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: PromptDto & { provider?: string },
  ) {
    this.ensureProviderIsLmStudio(body?.provider);

    const { prompt, model, systemInstruction } = body || {};
    if (!file) return { error: 'document file is required (field: document)' };
    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });
    parts.push(this.lmstudio.buildInlineDataPart(file.buffer, file.mimetype));
    return this.lmstudio.generateFromInlineParts(parts, {
      model,
      systemInstruction,
    });
  }

  /**
   * Generate from an audio upload + optional prompt/system instruction.
   */
  @Post('generate-from-audio')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    }),
  )
  @HttpCode(HttpStatus.OK)
  generateFromAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: PromptDto & { provider?: string },
  ) {
    this.ensureProviderIsLmStudio(body?.provider);

    const { prompt, model, systemInstruction } = body || {};
    if (!file) return { error: 'audio file is required (field: audio)' };
    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });
    parts.push(this.lmstudio.buildInlineDataPart(file.buffer, file.mimetype));
    return this.lmstudio.generateFromInlineParts(parts, {
      model,
      systemInstruction,
    });
  }

  /**
   * Ensures that if a provider is specified, it is "lmstudio".
   * If provider is omitted, we accept the request (this controller only handles LM Studio).
   */
  private ensureProviderIsLmStudio(provider?: string) {
    if (!provider) return;
    if (provider.toLowerCase() !== 'lmstudio') {
      throw new BadRequestException(
        'Invalid provider for this route: expected "lmstudio".',
      );
    }
  }
}
