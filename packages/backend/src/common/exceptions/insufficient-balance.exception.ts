import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when a financial operation cannot be completed due to insufficient balance
 * Returns HTTP 400 Bad Request
 */
export class InsufficientBalanceException extends HttpException {
  constructor(accountId: string, requiredAmount: number, availableAmount: number) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'INSUFFICIENT_BALANCE',
        message: `Insufficient balance. Required: $${requiredAmount.toFixed(2)}, Available: $${availableAmount.toFixed(2)}`,
        details: {
          accountId,
          requiredAmount,
          availableAmount,
          shortfall: requiredAmount - availableAmount,
        },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
