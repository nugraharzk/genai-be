import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { GeminiController } from './gemini.controller';
import { LmStudioModule } from '../lmstudio/lmstudio.module';

@Module({
  imports: [LmStudioModule],
  controllers: [GeminiController],

  providers: [GeminiService],
})
export class GeminiModule {}
