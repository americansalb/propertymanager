import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/**
 * Extract user ID from authenticated user
 * The JWT strategy returns a full User object (not raw JWT payload)
 * so we access user.id instead of user.sub
 */
export const UserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  // The JWT strategy validate() returns a User object with 'id' property
  // (not the raw JWT payload which would have 'sub')
  return user?.id || '';
});
