import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsInt, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';

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
  name: string;

  @ApiProperty({ enum: PropertyType, description: 'Type of property' })
  @IsEnum(PropertyType)
  type: PropertyType;

  @ApiPropertyOptional({ enum: PropertyStatus, description: 'Property status', default: PropertyStatus.ACTIVE })
  @IsEnum(PropertyStatus)
  @IsOptional()
  status?: PropertyStatus;

  @ApiProperty({ description: 'Street address line 1' })
  @IsString()
  address1: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  @IsString()
  @IsOptional()
  address2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'State' })
  @IsString()
  state: string;

  @ApiProperty({ description: 'ZIP code' })
  @IsString()
  zipCode: string;

  @ApiPropertyOptional({ description: 'Country', default: 'US' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Year the property was built' })
  @IsInt()
  @IsOptional()
  yearBuilt?: number;

  @ApiProperty({ description: 'Total number of units' })
  @IsInt()
  @Min(1)
  totalUnits: number;

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

  @ApiPropertyOptional({ description: 'Additional property settings' })
  @IsOptional()
  settings?: any;
}

export class UpdatePropertyDto {
  @ApiPropertyOptional({ description: 'Property name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: PropertyType, description: 'Type of property' })
  @IsEnum(PropertyType)
  @IsOptional()
  type?: PropertyType;

  @ApiPropertyOptional({ enum: PropertyStatus, description: 'Property status' })
  @IsEnum(PropertyStatus)
  @IsOptional()
  status?: PropertyStatus;

  @ApiPropertyOptional({ description: 'Street address line 1' })
  @IsString()
  @IsOptional()
  address1?: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  @IsString()
  @IsOptional()
  address2?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'ZIP code' })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Year the property was built' })
  @IsInt()
  @IsOptional()
  yearBuilt?: number;

  @ApiPropertyOptional({ description: 'Total number of units' })
  @IsInt()
  @Min(1)
  @IsOptional()
  totalUnits?: number;

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

  @ApiPropertyOptional({ description: 'Additional property settings' })
  @IsOptional()
  settings?: any;
}
