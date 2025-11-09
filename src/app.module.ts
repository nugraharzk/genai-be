import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GeminiModule } from './gemini/gemini.module';
import { LmStudioModule } from './lmstudio/lmstudio.module';

@Module({
  imports: [GeminiModule, LmStudioModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
