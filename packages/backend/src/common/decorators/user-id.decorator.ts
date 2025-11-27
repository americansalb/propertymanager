import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type JwtPayload } from '../../auth/auth.service';

/**
 * Extract user ID from JWT payload
 */
export const UserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as JwtPayload;
  return user.sub;
});
