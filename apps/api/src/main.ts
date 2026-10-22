import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Atrás do proxy do host, o IP do cliente vem de X-Forwarded-For. Sem isso, o rate limit veria
  // todo mundo como um IP só (o do proxy).
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
