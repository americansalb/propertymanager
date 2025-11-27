import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsEmail,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LeaseStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  CANCELLED = 'CANCELLED',
}

export enum LeaseType {
  FIXED_TERM = 'FIXED_TERM',
  MONTH_TO_MONTH = 'MONTH_TO_MONTH',
  COMMERCIAL = 'COMMERCIAL',
}

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant first name' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ description: 'Tenant last name' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({ description: 'Tenant email address' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'Tenant phone number' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiPropertyOptional({ description: 'Is this the primary tenant?', default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Emergency contact name' })
  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional({ description: 'Emergency contact phone' })
  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;
}

export class CreateLeaseDto {
  @ApiProperty({ description: 'Unit ID for this lease' })
  @IsString()
  @IsNotEmpty()
  unitId!: string;

  @ApiProperty({ enum: LeaseType, description: 'Type of lease' })
  @IsEnum(LeaseType)
  type!: LeaseType;

  @ApiProperty({ description: 'Lease start date (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: 'Lease end date (ISO 8601) - required for FIXED_TERM' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Move-in date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  moveInDate?: string;

  @ApiProperty({ description: 'Monthly rent amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRent!: number;

  @ApiProperty({ description: 'Security deposit amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit!: number;

  @ApiPropertyOptional({ description: 'Additional lease terms as JSON' })
  @IsOptional()
  terms?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'URL to lease document' })
  @IsString()
  @IsOptional()
  documentUrl?: string;

  @ApiProperty({
    description: 'Tenants for this lease (at least one required, exactly one must be primary)',
    type: [CreateTenantDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTenantDto)
  tenants!: CreateTenantDto[];
}
