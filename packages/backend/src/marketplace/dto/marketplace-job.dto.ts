import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum MarketplaceJobSource {
  MARKETPLACE = 'MARKETPLACE',
  BYOV = 'BYOV',
}

export enum MarketplaceJobStatus {
  PENDING_DISPATCH = 'PENDING_DISPATCH',
  DISPATCHED = 'DISPATCHED',
  ACCEPTED = 'ACCEPTED',
  QUOTE_SUBMITTED = 'QUOTE_SUBMITTED',
  QUOTE_APPROVED = 'QUOTE_APPROVED',
  QUOTE_DECLINED = 'QUOTE_DECLINED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CONFIRMED = 'CONFIRMED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

export enum ProtectionTier {
  BASIC = 'BASIC',
  PROTECTED = 'PROTECTED',
}

export class CreateMarketplaceJobDto {
  @ApiProperty({ description: 'Work order ID to create marketplace job from' })
  @IsString()
  workOrderId!: string;

  @ApiPropertyOptional({ enum: MarketplaceJobSource, description: 'Job source' })
  @IsOptional()
  @IsEnum(MarketplaceJobSource)
  source?: MarketplaceJobSource;

  @ApiPropertyOptional({ description: 'Service catalog ID' })
  @IsOptional()
  @IsString()
  serviceCatalogId?: string;

  @ApiPropertyOptional({ enum: ProtectionTier, description: 'Protection tier' })
  @IsOptional()
  @IsEnum(ProtectionTier)
  protectionTier?: ProtectionTier;

  @ApiPropertyOptional({ description: 'Estimated total cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  estimatedTotal?: number;
}

export class DispatchJobDto {
  @ApiProperty({ description: 'Vendor profile ID to dispatch to' })
  @IsString()
  vendorProfileId!: string;

  @ApiPropertyOptional({ description: 'Scheduled date for the job' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Time slot', example: '9am-12pm' })
  @IsOptional()
  @IsString()
  scheduledTimeSlot?: string;

  @ApiPropertyOptional({ description: 'Estimated amount to authorize' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  estimatedAmount?: number;
}

export class AcceptJobDto {
  @ApiPropertyOptional({ description: 'Estimated arrival time' })
  @IsOptional()
  @IsDateString()
  vendorEta?: string;

  @ApiPropertyOptional({ description: 'Notes from vendor' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class DeclineJobDto {
  @ApiProperty({ description: 'Reason for declining' })
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class SubmitQuoteDto {
  @ApiProperty({ description: 'Labor cost' })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  laborCost!: number;

  @ApiPropertyOptional({ description: 'Parts cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  partsCost?: number;

  @ApiProperty({ description: 'Quote description' })
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({ description: 'Photo URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class CompleteJobDto {
  @ApiProperty({ description: 'Actual total cost' })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  actualCost!: number;

  @ApiPropertyOptional({ description: 'Completion notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  completionNotes?: string;

  @ApiPropertyOptional({ description: 'Completion photo URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completionPhotos?: string[];
}

export class ConfirmJobDto {
  @ApiPropertyOptional({ description: 'Confirmation notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class DisputeJobDto {
  @ApiProperty({ description: 'Dispute reason' })
  @IsString()
  @MaxLength(2000)
  reason!: string;

  @ApiPropertyOptional({ description: 'Evidence photo URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence?: string[];
}

export class MarketplaceJobQueryDto {
  @ApiPropertyOptional({ enum: MarketplaceJobStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(MarketplaceJobStatus)
  status?: MarketplaceJobStatus;

  @ApiPropertyOptional({ description: 'Filter by vendor profile ID' })
  @IsOptional()
  @IsString()
  vendorProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by property ID' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
