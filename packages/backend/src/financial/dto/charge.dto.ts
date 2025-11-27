import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ChargeType {
  RENT = 'RENT',
  LATE_FEE = 'LATE_FEE',
  PET_FEE = 'PET_FEE',
  PARKING = 'PARKING',
  AMENITY = 'AMENITY',
  UTILITY = 'UTILITY',
  NSF_FEE = 'NSF_FEE',
  DAMAGE = 'DAMAGE',
  OTHER = 'OTHER',
}

export enum ChargeStatus {
  PENDING = 'PENDING',
  POSTED = 'POSTED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  VOID = 'VOID',
}

export class CreateChargeDto {
  @ApiProperty({ description: 'Lease ID for this charge' })
  @IsString()
  @IsNotEmpty()
  leaseId!: string;

  @ApiProperty({ enum: ChargeType, description: 'Type of charge' })
  @IsEnum(ChargeType)
  type!: ChargeType;

  @ApiProperty({ description: 'Charge amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Charge description' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'Due date (ISO 8601)' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ description: 'Post date (ISO 8601) - if not provided, charge is PENDING' })
  @IsDateString()
  @IsOptional()
  postDate?: string;

  @ApiPropertyOptional({ description: 'Is this a recurring charge template?', default: false })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;
}

export class UpdateChargeDto {
  @ApiPropertyOptional({ enum: ChargeType, description: 'Type of charge' })
  @IsEnum(ChargeType)
  @IsOptional()
  type?: ChargeType;

  @ApiPropertyOptional({ description: 'Charge amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Charge description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class PostChargeDto {
  @ApiPropertyOptional({ description: 'Post date (ISO 8601) - defaults to now' })
  @IsDateString()
  @IsOptional()
  postDate?: string;
}

export class GenerateRentChargesDto {
  @ApiPropertyOptional({ description: 'Generate for specific property ID' })
  @IsString()
  @IsOptional()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Billing month (1-12)' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  month?: number;

  @ApiPropertyOptional({ description: 'Billing year' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: 'Due day of month (1-28)', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  dueDay?: number;
}

export class GenerateLateFeeDto {
  @ApiPropertyOptional({ description: 'Generate for specific property ID' })
  @IsString()
  @IsOptional()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Grace period in days', default: 5 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  gracePeriodDays?: number;

  @ApiPropertyOptional({ description: 'Late fee type: FLAT or PERCENTAGE', default: 'FLAT' })
  @IsString()
  @IsOptional()
  feeType?: 'FLAT' | 'PERCENTAGE';

  @ApiPropertyOptional({ description: 'Late fee amount (flat $ or percentage)', default: 50 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  feeAmount?: number;
}
