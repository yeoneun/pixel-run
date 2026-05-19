import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  });

  const frameAncestors =
    allowedOrigins.length > 0
      ? `frame-ancestors 'self' ${allowedOrigins.join(' ')}`
      : "frame-ancestors 'self'";

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Security-Policy', frameAncestors);
    next();
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
