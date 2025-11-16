import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@propertymaster/shared';

/**
 * Extract current user from request
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
