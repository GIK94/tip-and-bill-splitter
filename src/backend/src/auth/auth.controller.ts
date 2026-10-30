import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { APP_CONFIG, AppConfig } from '../config';
import { PublicUser, toPublicUser, User } from '../users/user.entity';
import { LoginDto, SignupDto } from './auth.dto';
import { AuthService } from './auth.service';
import { SESSION_COOKIE } from './jwt-auth.guard';

/** Sign-up and login are limited to 10 attempts per minute per IP to slow down password guessing. */
const AUTH_RATE_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', secure: this.config.cookieSecure, path: '/' };
  }

  private async startSession(user: User, res: Response): Promise<{ user: PublicUser }> {
    const token = await this.auth.createSessionToken(user);
    res.cookie(SESSION_COOKIE, token, { ...this.cookieOptions(), maxAge: this.config.sessionHours * 3_600_000 });
    return { user: toPublicUser(user) };
  }

  @Post('signup')
  @Throttle(AUTH_RATE_LIMIT)
  async signup(@Body() dto: SignupDto, @Res({ passthrough: true }) res: Response) {
    return this.startSession(await this.auth.signup(dto), res);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(AUTH_RATE_LIMIT)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.startSession(await this.auth.login(dto), res);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  /** The current user, or `{ user: null }` for guests (so the app can check without an error). */
  @Get('me')
  async me(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token: string | undefined = req.cookies?.[SESSION_COOKIE];
    const user = await this.auth.userFromToken(token);
    if (token && !user) res.clearCookie(SESSION_COOKIE, this.cookieOptions());
    return { user };
  }
}
