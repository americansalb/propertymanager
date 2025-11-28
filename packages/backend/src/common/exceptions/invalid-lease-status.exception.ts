import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a lease status transition is not allowed
 * Returns HTTP 400 Bad Request
 */
export class InvalidLeaseStatusException extends HttpException {
  constructor(
    leaseId: string,
    currentStatus: string,
    attemptedStatus: string,
    allowedStatuses?: string[],
  ) {
    const allowedMessage = allowedStatuses?.length
      ? ` Allowed transitions: ${allowedStatuses.join(', ')}`
      : '';

    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'INVALID_LEASE_STATUS_TRANSITION',
        message: `Cannot change lease status from ${currentStatus} to ${attemptedStatus}.${allowedMessage}`,
        details: {
          leaseId,
          currentStatus,
          attemptedStatus,
          allowedStatuses,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
