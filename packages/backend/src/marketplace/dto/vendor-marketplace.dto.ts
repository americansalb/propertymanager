import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum VendorTier {
  STANDARD = 'STANDARD',
  VERIFIED_PRICING = 'VERIFIED_PRICING',
  PREMIUM = 'PREMIUM',
}

export enum VendorVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export class CreateVendorMarketplaceProfileDto {
  @ApiProperty({ description: 'Vendor ID to create marketplace profile for' })
  @IsString()
  vendorId!: string;

  @ApiPropertyOptional({ enum: VendorTier, description: 'Vendor tier' })
  @IsOptional()
  @IsEnum(VendorTier)
  tier?: VendorTier;

  @ApiPropertyOptional({ description: 'Is active on marketplace' })
  @IsOptional()
  @IsBoolean()
  isMarketplaceActive?: boolean;

  @ApiPropertyOptional({ description: 'ZIP codes vendor serves' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceZipCodes?: string[];

  @ApiPropertyOptional({ description: 'Service radius in miles' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  serviceRadius?: number;

  @ApiPropertyOptional({ description: 'Max concurrent jobs' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  maxConcurrentJobs?: number;
}

export class UpdateVendorMarketplaceProfileDto {
  @ApiPropertyOptional({ enum: VendorTier, description: 'Vendor tier' })
  @IsOptional()
  @IsEnum(VendorTier)
  tier?: VendorTier;

  @ApiPropertyOptional({ description: 'Is active on marketplace' })
  @IsOptional()
  @IsBoolean()
  isMarketplaceActive?: boolean;

  @ApiPropertyOptional({ description: 'ZIP codes vendor serves' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceZipCodes?: string[];

  @ApiPropertyOptional({ description: 'Service radius in miles' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  serviceRadius?: number;

  @ApiPropertyOptional({ description: 'Is accepting jobs' })
  @IsOptional()
  @IsBoolean()
  acceptingJobs?: boolean;

  @ApiPropertyOptional({ description: 'Max concurrent jobs' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(50)
  maxConcurrentJobs?: number;

  @ApiPropertyOptional({ description: 'Payout speed: standard or instant' })
  @IsOptional()
  @IsString()
  payoutSpeed?: string;
}

export class AddVendorServiceDto {
  @ApiProperty({ description: 'Service catalog ID' })
  @IsString()
  serviceCatalogId!: string;

  @ApiPropertyOptional({ description: 'Custom quote fee' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  customQuoteFee?: number;

  @ApiPropertyOptional({ description: 'Custom hourly labor rate' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  customLaborRate?: number;

  @ApiPropertyOptional({ description: 'Custom flat rate' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  customFlatRate?: number;
}

export class UpdateVendorServiceDto {
  @ApiPropertyOptional({ description: 'Custom quote fee' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  customQuoteFee?: number;

  @ApiPropertyOptional({ description: 'Custom hourly labor rate' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  customLaborRate?: number;

  @ApiPropertyOptional({ description: 'Custom flat rate' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  customFlatRate?: number;

  @ApiPropertyOptional({ description: 'Is service active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class VendorMarketplaceQueryDto {
  @ApiPropertyOptional({ description: 'Filter by service category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by ZIP code' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ enum: VendorTier, description: 'Filter by tier' })
  @IsOptional()
  @IsEnum(VendorTier)
  tier?: VendorTier;

  @ApiPropertyOptional({ description: 'Minimum rating filter' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Only show vendors accepting jobs' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  acceptingOnly?: boolean;

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
