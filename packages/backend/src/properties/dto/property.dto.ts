import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsDateString,
  IsNumber,
  IsNotEmpty,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';

export enum PropertyType {
  MULTIFAMILY = 'MULTIFAMILY',
  SINGLE_FAMILY = 'SINGLE_FAMILY',
  COMMERCIAL = 'COMMERCIAL',
  MIXED_USE = 'MIXED_USE',
  STUDENT_HOUSING = 'STUDENT_HOUSING',
  SENIOR_LIVING = 'SENIOR_LIVING',
}

export enum PropertyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNDER_CONSTRUCTION = 'UNDER_CONSTRUCTION',
}

export class CreatePropertyDto {
  @ApiProperty({ description: 'Property name' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: PropertyType, description: 'Type of property' })
  @IsEnum(PropertyType)
  type!: PropertyType;

  @ApiPropertyOptional({
    enum: PropertyStatus,
    description: 'Property status',
    default: PropertyStatus.ACTIVE,
  })
  @IsEnum(PropertyStatus)
  @IsOptional()
  status?: PropertyStatus;

  @ApiProperty({ description: 'Street address line 1' })
  @IsString()
  address1!: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  @IsString()
  @IsOptional()
  address2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  city!: string;

  @ApiProperty({ description: 'State' })
  @IsString()
  state!: string;

  @ApiProperty({ description: 'ZIP code' })
  @IsString()
  zipCode!: string;

  @ApiPropertyOptional({ description: 'Country', default: 'US' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Latitude coordinate for map display' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude coordinate for map display' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Year the property was built' })
  @IsInt()
  @IsOptional()
  yearBuilt?: number;

  @ApiProperty({ description: 'Total number of units' })
  @IsInt()
  @Min(1)
  totalUnits!: number;

  @ApiPropertyOptional({ description: 'Total square footage' })
  @IsInt()
  @IsOptional()
  squareFeet?: number;

  @ApiPropertyOptional({ description: 'Date property was acquired' })
  @IsDateString()
  @IsOptional()
  acquisitionDate?: string;

  @ApiPropertyOptional({ description: 'Acquisition cost' })
  @IsNumber()
  @IsOptional()
  acquisitionCost?: number;

  @ApiPropertyOptional({ description: 'Additional property settings as JSON' })
  @IsOptional()
  settings?: Record<string, unknown>;
}

/**
 * UpdatePropertyDto - Aligned with CreatePropertyDto for consistency
 */
export class UpdatePropertyDto {
  @ApiProperty({ example: 'Sunset Villas', description: 'Property name', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '123 Main St', description: 'Street address line 1', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address1!: string;

  @ApiPropertyOptional({ example: 'Apt 4B', description: 'Street address line 2', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  address2?: string | null;

  @ApiProperty({ example: 'Austin', description: 'City', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @ApiProperty({ example: 'TX', description: 'State (2-letter code)', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  state!: string;

  @ApiProperty({
    example: '78701',
    description: 'Postal code (3-16 chars, letters/numbers/hyphen/space)',
    maxLength: 16,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(16)
  @Matches(/^[A-Za-z0-9\- ]{3,16}$/, {
    message: 'zipCode must be 3-16 chars, letters/numbers/hyphen/space only',
  })
  zipCode!: string;

  @ApiProperty({ example: 'US', description: 'Country (2-letter code)', default: 'US' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2)
  country!: string;

  @ApiProperty({
    enum: PropertyType,
    example: PropertyType.MULTIFAMILY,
    description: 'Type of property',
  })
  @IsEnum(PropertyType)
  type!: PropertyType;

  @ApiProperty({
    enum: PropertyStatus,
    example: PropertyStatus.ACTIVE,
    description: 'Property status',
  })
  @IsEnum(PropertyStatus)
  status!: PropertyStatus;

  @ApiPropertyOptional({ description: 'Year the property was built' })
  @IsInt()
  @IsOptional()
  yearBuilt?: number;

  @ApiProperty({ description: 'Total number of units' })
  @IsInt()
  @Min(1)
  totalUnits!: number;

  @ApiPropertyOptional({ description: 'Total square footage' })
  @IsInt()
  @IsOptional()
  squareFeet?: number;
}
