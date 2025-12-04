import { type Request } from 'express';
import { type JwtPayload } from '../../auth/auth.service';

/**
 * Express Request with authenticated user payload
 * Note: user.sub contains the user ID
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
