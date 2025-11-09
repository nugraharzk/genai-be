import { Module } from '@nestjs/common';
import { LmStudioController } from './lmstudio.controller';
import { LmStudioService } from './lmstudio.service';

/**
 * LmStudioModule
 *
 * Provides LM Studio endpoints under the /lm route prefix, mirroring the Gemini feature set:
 * - POST /lm/api/chat
 * - POST /lm/generate-text
 * - POST /lm/generate-from-image
 * - POST /lm/generate-from-document
 * - POST /lm/generate-from-audio
 *
 * Integration:
 * - Add `LmStudioModule` to the `imports` array in `AppModule` to enable these routes:
 *   `imports: [GeminiModule, LmStudioModule]`
 */
@Module({
  controllers: [LmStudioController],
  providers: [LmStudioService],
  exports: [LmStudioService],
})
export class LmStudioModule {}
