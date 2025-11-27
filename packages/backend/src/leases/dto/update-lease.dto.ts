import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LeaseType } from './create-lease.dto';

export class UpdateLeaseDto {
  @ApiPropertyOptional({ enum: LeaseType, description: 'Type of lease' })
  @IsEnum(LeaseType)
  @IsOptional()
  type?: LeaseType;

  @ApiPropertyOptional({ description: 'Lease start date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Lease end date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Move-in date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  moveInDate?: string;

  @ApiPropertyOptional({ description: 'Monthly rent amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyRent?: number;

  @ApiPropertyOptional({ description: 'Security deposit amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  securityDeposit?: number;

  @ApiPropertyOptional({ description: 'Additional lease terms as JSON' })
  @IsOptional()
  terms?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'URL to lease document' })
  @IsString()
  @IsOptional()
  documentUrl?: string;
}

export class TerminateLeaseDto {
  @ApiPropertyOptional({ description: 'Reason for termination' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Move-out date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  moveOutDate?: string;

  @ApiPropertyOptional({ description: 'Notice date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  noticeDate?: string;
}

export class RenewLeaseDto {
  @ApiPropertyOptional({
    description: 'New lease start date (defaults to day after current end date)',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'New lease end date' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'New monthly rent (defaults to current rent)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyRent?: number;

  @ApiPropertyOptional({
    enum: LeaseType,
    description: 'New lease type (defaults to current type)',
  })
  @IsEnum(LeaseType)
  @IsOptional()
  type?: LeaseType;
}

export class AddTenantDto {
  @ApiPropertyOptional({ description: 'Tenant first name' })
  @IsString()
  firstName!: string;

  @ApiPropertyOptional({ description: 'Tenant last name' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ description: 'Tenant email address' })
  @IsString()
  email!: string;

  @ApiPropertyOptional({ description: 'Tenant phone number' })
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ description: 'Is this the primary tenant?', default: false })
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
