import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { RealtimeIoAdapter } from './modules/realtime/realtime-io.adapter';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.use(cookieParser());
  app.useWebSocketAdapter(new RealtimeIoAdapter(app));
  const origin = process.env.CORS_ORIGIN?.split(',') ?? [
    'http://localhost:3000',
  ];
  app.enableCors({ origin, credentials: true });
}