import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SkipThrottle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { Calculation } from './calculations/calculation.entity';
import { CalculationsModule } from './calculations/calculations.module';
import { APP_CONFIG, AppConfig, AppConfigModule } from './config';
import { Init1761700000000 } from './database/migrations/1761700000000-init';
import { User } from './users/user.entity';

@Controller('health')
@SkipThrottle()
export class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: ({ db }: AppConfig) => ({
        type: 'mysql',
        ...db,
        entities: [User, Calculation],
        migrations: [Init1761700000000],
        migrationsRun: true,
        synchronize: false,
        timezone: 'Z',
        charset: 'utf8mb4_unicode_ci',
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    // Generous global limit; auth routes set a much stricter one.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    AuthModule,
    CalculationsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
