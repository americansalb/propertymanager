import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsInt, IsOptional, IsNumber, Min } from 'class-validator';

export enum UnitType {
  STUDIO = 'STUDIO',
  ONE_BED = 'ONE_BED',
  TWO_BED = 'TWO_BED',
  THREE_BED = 'THREE_BED',
  FOUR_PLUS_BED = 'FOUR_PLUS_BED',
  COMMERCIAL = 'COMMERCIAL',
}

export enum UnitStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  VACANT_RENTED = 'VACANT_RENTED',
  NOTICE = 'NOTICE',
  MAINTENANCE = 'MAINTENANCE',
}

export class CreateUnitDto {
  @ApiProperty({ description: 'Unit number/identifier' })
  @IsString()
  unitNumber!: string;

  @ApiPropertyOptional({ description: 'Floor number' })
  @IsInt()
  @IsOptional()
  floor?: number;

  @ApiProperty({ enum: UnitType, description: 'Type of unit' })
  @IsEnum(UnitType)
  type!: UnitType;

  @ApiPropertyOptional({ enum: UnitStatus, description: 'Unit status', default: UnitStatus.VACANT })
  @IsEnum(UnitStatus)
  @IsOptional()
  status?: UnitStatus;

  @ApiProperty({ description: 'Number of bedrooms' })
  @IsInt()
  @Min(0)
  bedrooms!: number;

  @ApiProperty({ description: 'Number of bathrooms (e.g., 1.5, 2.0)' })
  @IsNumber()
  @Min(0)
  bathrooms!: number;

  @ApiPropertyOptional({ description: 'Square footage' })
  @IsInt()
  @Min(0)
  @IsOptional()
  squareFeet?: number;

  @ApiProperty({ description: 'Market rent amount' })
  @IsNumber()
  @Min(0)
  marketRent!: number;

  @ApiProperty({ description: 'Property ID this unit belongs to' })
  @IsString()
  propertyId!: string;
}

export class UpdateUnitDto {
  @ApiPropertyOptional({ description: 'Unit number/identifier' })
  @IsString()
  @IsOptional()
  unitNumber?: string;

  @ApiPropertyOptional({ description: 'Floor number' })
  @IsInt()
  @IsOptional()
  floor?: number;

  @ApiPropertyOptional({ enum: UnitType, description: 'Type of unit' })
  @IsEnum(UnitType)
  @IsOptional()
  type?: UnitType;

  @ApiPropertyOptional({ enum: UnitStatus, description: 'Unit status' })
  @IsEnum(UnitStatus)
  @IsOptional()
  status?: UnitStatus;

  @ApiPropertyOptional({ description: 'Number of bedrooms' })
  @IsInt()
  @Min(0)
  @IsOptional()
  bedrooms?: number;

  @ApiPropertyOptional({ description: 'Number of bathrooms (e.g., 1.5, 2.0)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  bathrooms?: number;

  @ApiPropertyOptional({ description: 'Square footage' })
  @IsInt()
  @Min(0)
  @IsOptional()
  squareFeet?: number;

  @ApiPropertyOptional({ description: 'Market rent amount' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  marketRent?: number;
}
