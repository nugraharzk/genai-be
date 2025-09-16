import {
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

type TextDto = {
  prompt: string;
  model?: string;
  systemInstruction?: string;
};

type PromptDto = {
  prompt?: string;
  model?: string;
  systemInstruction?: string;
};

@Controller()
export class GeminiController {
  constructor(private readonly gemini: GeminiService) {}

  @Post('generate-text')
  @HttpCode(HttpStatus.OK)
  async generateText(@Body() body: TextDto) {
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
  async generateFromImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: PromptDto,
  ) {
    const { prompt, model, systemInstruction } = body || {};
    if (!file) return { error: 'image file is required (field: image)' };
    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });
    parts.push(this.gemini.buildInlineDataPart(file.buffer, file.mimetype));
    return this.gemini.generateFromInlineParts(parts, { model, systemInstruction });
  }

  @Post('generate-from-document')
  @UseInterceptors(
    FileInterceptor('document', {
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  )
  @HttpCode(HttpStatus.OK)
  async generateFromDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: PromptDto,
  ) {
    const { prompt, model, systemInstruction } = body || {};
    if (!file) return { error: 'document file is required (field: document)' };
    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });
    parts.push(this.gemini.buildInlineDataPart(file.buffer, file.mimetype));
    return this.gemini.generateFromInlineParts(parts, { model, systemInstruction });
  }

  @Post('generate-from-audio')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    }),
  )
  @HttpCode(HttpStatus.OK)
  async generateFromAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: PromptDto,
  ) {
    const { prompt, model, systemInstruction } = body || {};
    if (!file) return { error: 'audio file is required (field: audio)' };
    const parts: any[] = [];
    if (prompt) parts.push({ text: prompt });
    parts.push(this.gemini.buildInlineDataPart(file.buffer, file.mimetype));
    return this.gemini.generateFromInlineParts(parts, { model, systemInstruction });
  }
}

