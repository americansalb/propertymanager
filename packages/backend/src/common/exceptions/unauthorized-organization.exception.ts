import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a user attempts to access resources from a different organization
 * Returns HTTP 403 Forbidden
 */
export class UnauthorizedOrganizationException extends HttpException {
  constructor(resourceType: string, resourceId?: string) {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        error: 'UNAUTHORIZED_ORGANIZATION_ACCESS',
        message: `You do not have permission to access this ${resourceType}`,
        details: {
          resourceType,
          resourceId,
        },
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
