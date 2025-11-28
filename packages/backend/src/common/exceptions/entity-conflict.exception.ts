import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when an entity already exists or conflicts with existing data
 * Returns HTTP 409 Conflict
 */
export class EntityConflictException extends HttpException {
  constructor(entityName: string, conflictReason: string, details?: Record<string, unknown>) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'ENTITY_CONFLICT',
        message: `${entityName} conflict: ${conflictReason}`,
        details: {
          entity: entityName,
          reason: conflictReason,
          ...details,
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}
