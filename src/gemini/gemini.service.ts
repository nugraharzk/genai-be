import { Injectable, InternalServerErrorException } from '@nestjs/common';

type GenerateOptions = {
  model?: string;
  systemInstruction?: string;
};

@Injectable()
export class GeminiService {
  private client: any;
  private clientMode: 'genai' | 'generative-ai' | null = null;
  private defaultModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in environment',
      );
    }
    // Defer actual loading until first use to surface clearer errors in context
    this.client = null;
  }

  async generateText(prompt: string, options: GenerateOptions = {}) {
    try {
      const modelName = options.model || this.defaultModel;
      await this.ensureClient();
      if (this.clientMode === 'genai' && this.client?.responses?.generate) {
        const req: any = { model: modelName };
        if (options.systemInstruction)
          req.systemInstruction = options.systemInstruction;
        req.input = prompt;
        const result = await this.client.responses.generate(req);
        const text =
          result?.output_text ??
          result?.response?.text?.() ??
          result?.candidates?.[0]?.content?.parts?.[0]?.text ??
          result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        return { model: modelName, text };
      } else if (this.client?.getGenerativeModel) {
        const model = this.client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text =
          result?.response?.text?.() ??
          result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        return { model: modelName, text };
      }
      throw new Error('No compatible Gemini client available');
    } catch (err: any) {
      throw new InternalServerErrorException(this.normalizeError(err));
    }
  }

  async generateFromInlineParts(parts: any[], options: GenerateOptions = {}) {
    try {
      const modelName = options.model || this.defaultModel;
      await this.ensureClient();
      if (this.clientMode === 'genai' && this.client?.responses?.generate) {
        const req: any = { model: modelName };
        if (options.systemInstruction)
          req.systemInstruction = options.systemInstruction;
        req.input = [
          {
            role: 'user',
            parts,
          },
        ];
        const result = await this.client.responses.generate(req);
        const text =
          result?.output_text ??
          result?.response?.text?.() ??
          result?.candidates?.[0]?.content?.parts?.[0]?.text ??
          result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        return { model: modelName, text };
      } else if (this.client?.getGenerativeModel) {
        const model = this.client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(parts);
        const text =
          result?.response?.text?.() ??
          result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
        return { model: modelName, text };
      }
      throw new Error('No compatible Gemini client available');
    } catch (err: any) {
      throw new InternalServerErrorException(this.normalizeError(err));
    }
  }

  buildInlineDataPart(buffer: Buffer, mimeType: string) {
    const base64 = buffer.toString('base64');
    return { inlineData: { data: base64, mimeType } };
  }

  private async ensureClient() {
    if (this.client) return;
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'Missing GEMINI_API_KEY (or GOOGLE_API_KEY) in environment',
      );
    }
    // Try new SDK first (@google/genai)
    try {
      const mod = await import('@google/genai');
      const maybeCtor =
        (mod as any).GoogleAI || (mod as any).default || (mod as any).Client;
      if (typeof maybeCtor === 'function') {
        this.client = new maybeCtor({ apiKey });
        this.clientMode = 'genai';
        return;
      }
      // Some variants export a factory
      const maybeFactory =
        (mod as any).createClient || (mod as any).createGoogleAIClient;
      if (typeof maybeFactory === 'function') {
        this.client = maybeFactory({ apiKey });
        this.clientMode = 'genai';
        return;
      }
      // If module loaded but unexpected shape, fall through to legacy

      console.warn(
        'Loaded @google/genai but did not find a constructible client; falling back',
      );
    } catch (e) {
      // Continue to fallback

      console.warn('Failed to load @google/genai:', e);
    }

    // Fallback: legacy SDK (@google/generative-ai)
    try {
      const mod = await import('@google/generative-ai');
      const GoogleGenerativeAI =
        (mod as any).GoogleGenerativeAI || (mod as any).default;
      if (typeof GoogleGenerativeAI !== 'function') {
        throw new Error('Unexpected export shape for @google/generative-ai');
      }
      this.client = new GoogleGenerativeAI(apiKey);
      this.clientMode = 'generative-ai';
      return;
    } catch (e: any) {
      throw new InternalServerErrorException(
        `Failed to initialize Gemini client from either @google/genai or @google/generative-ai: ${e?.message || e}`,
      );
    }
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
