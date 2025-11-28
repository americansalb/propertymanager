import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to create a tenant that already exists
 * Returns HTTP 409 Conflict
 */
export class TenantAlreadyExistsException extends HttpException {
  constructor(email: string, organizationId?: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'TENANT_ALREADY_EXISTS',
        message: `A tenant with email ${email} already exists in this organization`,
        details: {
          email,
          organizationId,
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}
