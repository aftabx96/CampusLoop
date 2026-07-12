import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ROLES_KEY } from './decorators';
import { JwtPayload, Role } from './enums';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * Same JWT strategy, but never rejects the request: a valid token attaches
 * `request.user`, a missing/invalid one just leaves it undefined instead of
 * throwing 401. For endpoints (like the help chatbot) that should work for
 * both logged-in and anonymous visitors.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = JwtPayload>(_err: unknown, user: TUser | false): TUser {
    return (user || undefined) as TUser;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user }: { user: JwtPayload } = context
      .switchToHttp()
      .getRequest();
    return !!user && required.includes(user.role);
  }
}
