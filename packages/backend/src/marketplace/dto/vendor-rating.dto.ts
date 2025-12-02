import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVendorRatingDto {
  @ApiProperty({ description: 'Marketplace job ID' })
  @IsString()
  marketplaceJobId!: string;

  @ApiProperty({ description: 'Overall rating (1-5)' })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  overallRating!: number;

  @ApiPropertyOptional({ description: 'Quality rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  qualityRating?: number;

  @ApiPropertyOptional({ description: 'Communication rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiPropertyOptional({ description: 'Punctuality rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  punctualityRating?: number;

  @ApiPropertyOptional({ description: 'Value rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  valueRating?: number;

  @ApiPropertyOptional({ description: 'Written review' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  review?: string;

  @ApiPropertyOptional({ description: 'Photo URLs (before/after)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Is review public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateVendorRatingDto {
  @ApiPropertyOptional({ description: 'Written review' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  review?: string;

  @ApiPropertyOptional({ description: 'Photo URLs (before/after)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Is review public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class VendorRatingQueryDto {
  @ApiPropertyOptional({ description: 'Filter by minimum rating' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Only show public reviews' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  publicOnly?: boolean;

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
