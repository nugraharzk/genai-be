import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT) || 5000;
  app.enableCors();
  await app.listen(port);
}
// Avoid floating promise per ESLint rule
void bootstrap();
