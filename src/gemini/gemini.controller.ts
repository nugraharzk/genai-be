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
import type { ChatRequestDto, PromptDto, TextDto } from './dto';

@Controller()
export class GeminiController {
  constructor(private readonly gemini: GeminiService) {}

  @Post('api/chat')
  @HttpCode(HttpStatus.OK)
  chatWithGemini(@Body() body: ChatRequestDto) {
    const { prompt, model, systemInstruction, messages } = body || {};
    const trimmedPrompt = typeof prompt === 'string' ? prompt.trim() : '';

    let effectivePrompt = trimmedPrompt;

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

    return this.gemini.chat({
      prompt: effectivePrompt,
      model,
      systemInstruction,
      messages: Array.isArray(messages) ? messages : undefined,
    });
  }

  @Post('generate-text')
  @HttpCode(HttpStatus.OK)
  generateText(@Body() body: TextDto) {
    const { prompt, model, systemInstruction } = body || {};
    if (!prompt || typeof prompt !== 'string') {
      return { error: 'prompt is required (string)' };
    }
    return this.gemini.generateText(prompt, { model, systemInstruction });
  }

  @Post('generate-from-image')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
    }),
  )
  @HttpCode(HttpStatus.OK)
  generateFromImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: PromptDto,
  ) {
    const { prompt, model, systemInstruction } = body || {};
    if (!file) return { error: 'image file is required (field: image)' };
    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });
    parts.push(this.gemini.buildInlineDataPart(file.buffer, file.mimetype));
    return this.gemini.generateFromInlineParts(parts, {
      model,
      systemInstruction,
    });
  }

  @Post('generate-from-document')
  @UseInterceptors(
    FileInterceptor('document', {
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  )
  @HttpCode(HttpStatus.OK)
  generateFromDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: PromptDto,
  ) {
    const { prompt, model, systemInstruction } = body || {};
    if (!file) return { error: 'document file is required (field: document)' };
    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });
    parts.push(this.gemini.buildInlineDataPart(file.buffer, file.mimetype));
    return this.gemini.generateFromInlineParts(parts, {
      model,
      systemInstruction,
    });
  }

  @Post('generate-from-audio')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    }),
  )
  @HttpCode(HttpStatus.OK)
  generateFromAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: PromptDto,
  ) {
    const { prompt, model, systemInstruction } = body || {};
    if (!file) return { error: 'audio file is required (field: audio)' };
    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });
    parts.push(this.gemini.buildInlineDataPart(file.buffer, file.mimetype));
    return this.gemini.generateFromInlineParts(parts, {
      model,
      systemInstruction,
    });
  }
}
