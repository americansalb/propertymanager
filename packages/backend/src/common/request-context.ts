import { Request } from 'express';

/**
 * Request context metadata extracted from Express request
 * Used for logging and error tracking
 */
export interface RequestContextMeta {
  correlationId?: string;
  userId?: string;
  organizationId?: string;
}

/**
 * Extract request context metadata from Express request
 * Safely handles missing user or correlationId
 */
export const getRequestContextMeta = (req: Request): RequestContextMeta => {
  const correlationId = (req as any).correlationId as string | undefined;
  const user = (req as any).user as { id?: string; organizationId?: string } | undefined;

  return {
    correlationId,
    userId: user?.id,
    organizationId: user?.organizationId,
  };
};
