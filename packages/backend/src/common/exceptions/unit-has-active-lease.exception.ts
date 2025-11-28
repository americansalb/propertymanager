import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to delete a unit that has an active lease
 * Returns HTTP 400 Bad Request
 */
export class UnitHasActiveLeaseException extends HttpException {
  constructor(unitId: string, leaseId: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'UNIT_HAS_ACTIVE_LEASE',
        message: `Cannot delete unit because it has an active lease. Terminate the lease first.`,
        details: {
          unitId,
          leaseId,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
