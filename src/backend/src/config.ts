import { Global, Module } from '@nestjs/common';

export const APP_CONFIG = Symbol('APP_CONFIG');

export interface AppConfig {
  port: number;
  db: { host: string; port: number; username: string; password: string; database: string };
  jwtSecret: string;
  /** Session lifetime; used for both the JWT and the cookie. */
  sessionHours: number;
  /** Send the session cookie only over HTTPS. Off for plain-HTTP local runs. */
  cookieSecure: boolean;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const jwtSecret = required(env, 'JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return {
    port: Number(env.PORT ?? 3000),
    db: {
      host: required(env, 'DB_HOST'),
      port: Number(env.DB_PORT ?? 3306),
      username: required(env, 'DB_USER'),
      password: required(env, 'DB_PASSWORD'),
      database: required(env, 'DB_NAME'),
    },
    jwtSecret,
    sessionHours: 24,
    cookieSecure: env.COOKIE_SECURE === 'true',
  };
}

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadConfig() }],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
