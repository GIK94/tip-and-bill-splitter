import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/** Shared by main.ts and the e2e tests so both run the app exactly the same way. */
export function configureApp(app: NestExpressApplication): void {
  app.set('trust proxy', 1); // behind the frontend's nginx; needed for per-IP rate limits
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, // reject unknown fields, e.g. a client-supplied `result`
      transform: true,
    }),
  );
}
