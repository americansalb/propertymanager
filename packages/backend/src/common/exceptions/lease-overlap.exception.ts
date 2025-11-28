import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a new lease overlaps with an existing lease on the same unit
 * Returns HTTP 409 Conflict
 */
export class LeaseOverlapException extends HttpException {
  constructor(unitId: string, newStartDate: Date, newEndDate: Date, existingLeaseId: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'LEASE_OVERLAP',
        message: `Lease dates overlap with an existing lease on this unit`,
        details: {
          unitId,
          newStartDate: newStartDate.toISOString(),
          newEndDate: newEndDate.toISOString(),
          existingLeaseId,
        },
      },
      HttpStatus.CONFLICT,
    );
  }
}
