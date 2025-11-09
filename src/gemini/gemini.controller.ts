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
import { GeminiService } from './gemini.service';
import { LmStudioService } from '../lmstudio/lmstudio.service';
import type { ChatRequestDto, PromptDto, TextDto } from './dto';

/**
 * GeminiController
 *
 * Primary REST endpoints for text generation, multimodal uploads, and chat.
 * Provider-based routing:
 * - If `provider` is "lmstudio" or environment DEFAULT_PROVIDER=lmstudio, route to LmStudioService.
 * - Otherwise, route to GeminiService.
 *
 * Endpoints:
 * - POST /api/chat
 * - POST /generate-text
 * - POST /generate-from-image
 * - POST /generate-from-document
 * - POST /generate-from-audio
 */
@Controller()
export class GeminiController {
  constructor(
    private readonly gemini: GeminiService,
    private readonly lmstudio: LmStudioService,
  ) {}

  /**
   * Determine whether to use LM Studio based on explicit provider or environment default.
   */
  private shouldUseLmStudio(provider?: string): boolean {
    const p = provider?.toLowerCase();
    if (p) return p === 'lmstudio';
    const def = process.env.DEFAULT_PROVIDER?.toLowerCase();
    return def === 'lmstudio';
  }

  /**
   * Conversational chat endpoint.
   * Accepts either a `prompt` or derives it from the last user message in `messages`.
   */
  @Post('api/chat')
  @HttpCode(HttpStatus.OK)
  chatWithGemini(@Body() body: ChatRequestDto & { provider?: string }) {
    const { prompt, model, systemInstruction, messages, provider } = body || {};
    const trimmedPrompt = typeof prompt === 'string' ? prompt.trim() : '';

    let effectivePrompt = trimmedPrompt;

    // If prompt is missing, derive from the last user message
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

    const useLm = this.shouldUseLmStudio(provider);
    return useLm
      ? this.lmstudio.chat({
          prompt: effectivePrompt,
          model,
          systemInstruction,
          messages: Array.isArray(messages) ? messages : undefined,
        })
      : this.gemini.chat({
          prompt: effectivePrompt,
          model,
          systemInstruction,
          messages: Array.isArray(messages) ? messages : undefined,
        });
  }

  /**
   * Prompt-only text generation endpoint.
   */
  @Post('generate-text')
  @HttpCode(HttpStatus.OK)
  generateText(@Body() body: TextDto & { provider?: string }) {
    const { prompt, model, systemInstruction, provider } = body || {};
    if (!prompt || typeof prompt !== 'string') {
      return { error: 'prompt is required (string)' };
    }

    const useLm = this.shouldUseLmStudio(provider);
    return useLm
      ? this.lmstudio.generateText(prompt, { model, systemInstruction })
      : this.gemini.generateText(prompt, { model, systemInstruction });
  }

  /**
   * Image upload + optional prompt/system instruction -> text generation.
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
    const { prompt, model, systemInstruction, provider } = body || {};
    if (!file) return { error: 'image file is required (field: image)' };

    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });

    const useLm = this.shouldUseLmStudio(provider);
    const service = useLm ? this.lmstudio : this.gemini;

    parts.push(service.buildInlineDataPart(file.buffer, file.mimetype));

    return service.generateFromInlineParts(parts, {
      model,
      systemInstruction,
    });
  }

  /**
   * Document upload + optional prompt/system instruction -> text generation.
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
    const { prompt, model, systemInstruction, provider } = body || {};
    if (!file) return { error: 'document file is required (field: document)' };

    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });

    const useLm = this.shouldUseLmStudio(provider);
    const service = useLm ? this.lmstudio : this.gemini;

    parts.push(service.buildInlineDataPart(file.buffer, file.mimetype));

    return service.generateFromInlineParts(parts, {
      model,
      systemInstruction,
    });
  }

  /**
   * Audio upload + optional prompt/system instruction -> text generation.
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
    const { prompt, model, systemInstruction, provider } = body || {};
    if (!file) return { error: 'audio file is required (field: audio)' };

    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });

    const useLm = this.shouldUseLmStudio(provider);
    const service = useLm ? this.lmstudio : this.gemini;

    parts.push(service.buildInlineDataPart(file.buffer, file.mimetype));

    return service.generateFromInlineParts(parts, {
      model,
      systemInstruction,
    });
  }
}
