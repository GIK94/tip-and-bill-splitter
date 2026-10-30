import { CanActivate, createParamDecorator, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PublicUser } from '../users/user.entity';
import { AuthService } from './auth.service';

export const SESSION_COOKIE = 'tbs_session';

export type AuthenticatedRequest = Request & { user: PublicUser };

/** Requires a valid session cookie; attaches the user to the request. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.auth.userFromToken(request.cookies?.[SESSION_COOKIE]);
    if (!user) throw new UnauthorizedException('Please log in to continue.');
    request.user = user;
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): PublicUser => context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
