import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ServiceCategory {
  LOCKSMITH = 'LOCKSMITH',
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  HVAC = 'HVAC',
  APPLIANCE_REPAIR = 'APPLIANCE_REPAIR',
  CLEANING = 'CLEANING',
  LANDSCAPING = 'LANDSCAPING',
  PEST_CONTROL = 'PEST_CONTROL',
  PAINTING = 'PAINTING',
  FLOORING = 'FLOORING',
  ROOFING = 'ROOFING',
  GENERAL_HANDYMAN = 'GENERAL_HANDYMAN',
  OTHER = 'OTHER',
}

export enum MarketplaceRegion {
  CHICAGO_IL = 'CHICAGO_IL',
}

export class CreateServiceCatalogDto {
  @ApiProperty({ enum: ServiceCategory, description: 'Service category' })
  @IsEnum(ServiceCategory)
  category!: ServiceCategory;

  @ApiProperty({ description: 'Service name', example: 'Rekey Lock' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether service requires a quote visit' })
  @IsOptional()
  @IsBoolean()
  requiresQuote?: boolean;

  @ApiPropertyOptional({ description: 'Standard quote visit fee' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  standardQuoteFee?: number;

  @ApiPropertyOptional({ description: 'Is flat rate (vs hourly)' })
  @IsOptional()
  @IsBoolean()
  isFlatRate?: boolean;

  @ApiPropertyOptional({ description: 'Minimum labor cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  laborMin?: number;

  @ApiPropertyOptional({ description: 'Maximum labor cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  laborMax?: number;

  @ApiPropertyOptional({ description: 'Minimum parts cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  partsMin?: number;

  @ApiPropertyOptional({ description: 'Maximum parts cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  partsMax?: number;

  @ApiProperty({ description: 'Minimum typical total cost' })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  typicalTotalMin!: number;

  @ApiProperty({ description: 'Maximum typical total cost' })
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  typicalTotalMax!: number;

  @ApiPropertyOptional({ description: 'Typical duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  typicalDurationMinutes?: number;

  @ApiPropertyOptional({ enum: MarketplaceRegion, description: 'Geographic region' })
  @IsOptional()
  @IsEnum(MarketplaceRegion)
  region?: MarketplaceRegion;
}

export class UpdateServiceCatalogDto {
  @ApiPropertyOptional({ description: 'Service name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether service requires a quote visit' })
  @IsOptional()
  @IsBoolean()
  requiresQuote?: boolean;

  @ApiPropertyOptional({ description: 'Standard quote visit fee' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  standardQuoteFee?: number;

  @ApiPropertyOptional({ description: 'Is flat rate (vs hourly)' })
  @IsOptional()
  @IsBoolean()
  isFlatRate?: boolean;

  @ApiPropertyOptional({ description: 'Minimum labor cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  laborMin?: number;

  @ApiPropertyOptional({ description: 'Maximum labor cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  laborMax?: number;

  @ApiPropertyOptional({ description: 'Minimum parts cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  partsMin?: number;

  @ApiPropertyOptional({ description: 'Maximum parts cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  partsMax?: number;

  @ApiPropertyOptional({ description: 'Minimum typical total cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  typicalTotalMin?: number;

  @ApiPropertyOptional({ description: 'Maximum typical total cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  typicalTotalMax?: number;

  @ApiPropertyOptional({ description: 'Typical duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  typicalDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Is service active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ServiceCatalogQueryDto {
  @ApiPropertyOptional({ enum: ServiceCategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @ApiPropertyOptional({ enum: MarketplaceRegion, description: 'Filter by region' })
  @IsOptional()
  @IsEnum(MarketplaceRegion)
  region?: MarketplaceRegion;

  @ApiPropertyOptional({ description: 'Only show active services' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean;
}
