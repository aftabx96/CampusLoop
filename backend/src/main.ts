import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useStaticAssets(join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'), {
    prefix: '/uploads/',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CampusLoop API')
    .setDescription(
      'AI-Powered University Resource Sharing Platform — auto-generated API docs',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(parseInt(process.env.PORT || '3000', 10));
  console.log(`CampusLoop API running on port ${process.env.PORT || 3000} — Swagger at /api`);
}
bootstrap();
