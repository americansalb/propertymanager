import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  ACH = 'ACH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CHECK = 'CHECK',
  CASH = 'CASH',
  WIRE_TRANSFER = 'WIRE_TRANSFER',
  MONEY_ORDER = 'MONEY_ORDER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export class PaymentAllocationDto {
  @ApiProperty({ description: 'Charge ID to allocate payment to' })
  @IsString()
  @IsNotEmpty()
  chargeId!: string;

  @ApiProperty({ description: 'Amount to allocate to this charge' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class RecordPaymentDto {
  @ApiProperty({ description: 'Tenant ID making the payment' })
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method' })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ description: 'Total payment amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Payment date (ISO 8601)' })
  @IsDateString()
  paymentDate!: string;

  @ApiPropertyOptional({ description: 'Check number (for CHECK payments)' })
  @IsString()
  @IsOptional()
  checkNumber?: string;

  @ApiPropertyOptional({ description: 'Payment memo/notes' })
  @IsString()
  @IsOptional()
  memo?: string;

  @ApiPropertyOptional({
    description:
      'Allocations to specific charges. If not provided, auto-allocates to oldest charges.',
    type: [PaymentAllocationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  @IsOptional()
  allocations?: PaymentAllocationDto[];
}

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Tenant ID making the payment' })
  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @ApiProperty({ description: 'Payment amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Charge IDs to pay. If not provided, auto-selects oldest unpaid charges.',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  chargeIds?: string[];
}

export class RefundPaymentDto {
  @ApiPropertyOptional({ description: 'Refund amount (defaults to full payment amount)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Refund reason' })
  @IsString()
  @IsOptional()
  reason?: string;
}
