import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to delete a property that still has units
 * Returns HTTP 400 Bad Request
 */
export class PropertyHasUnitsException extends HttpException {
  constructor(propertyId: string, unitCount: number) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'PROPERTY_HAS_UNITS',
        message: `Cannot delete property because it has ${unitCount} active unit${unitCount === 1 ? '' : 's'}. Remove all units first.`,
        details: {
          propertyId,
          unitCount,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
