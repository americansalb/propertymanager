import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when an entity is not found in the database
 * Returns HTTP 404 Not Found
 */
export class EntityNotFoundException extends HttpException {
  constructor(entityName: string, identifier: string | number) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        error: 'ENTITY_NOT_FOUND',
        message: `${entityName} not found`,
        details: {
          entity: entityName,
          identifier,
        },
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
