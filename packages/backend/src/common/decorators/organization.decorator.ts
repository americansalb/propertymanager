import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/**
 * Extract organization ID from current user
 */
export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.organizationId;
  },
);
