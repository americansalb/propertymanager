import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProtectionTier {
  BASIC = 'BASIC',
  PROTECTED = 'PROTECTED',
}

export enum MarketplaceJobSource {
  MARKETPLACE = 'MARKETPLACE',
  BYOV = 'BYOV',
}

export class CreateMarketplaceJobDto {
  @ApiProperty({ description: 'Work order ID to convert to marketplace job' })
  @IsString()
  workOrderId!: string;

  @ApiPropertyOptional({ description: 'Service catalog ID if using standardized service' })
  @IsOptional()
  @IsString()
  serviceCatalogId?: string;

  @ApiProperty({
    description: 'Protection tier',
    enum: ProtectionTier,
    default: ProtectionTier.PROTECTED,
  })
  @IsEnum(ProtectionTier)
  protectionTier: ProtectionTier = ProtectionTier.PROTECTED;

  @ApiPropertyOptional({ description: 'Platform fee percentage (10-15%)' })
  @IsOptional()
  @IsNumber()
  platformFeePercent?: number;

  @ApiPropertyOptional({ description: 'Number of vendors to dispatch to (default: 3)' })
  @IsOptional()
  @IsNumber()
  maxVendorsToDispatch?: number;

  @ApiPropertyOptional({ description: 'Auto-dispatch to best vendors (vs manual selection)' })
  @IsOptional()
  @IsBoolean()
  autoDispatch?: boolean;
}

export class DispatchToVendorsDto {
  @ApiProperty({ description: 'List of vendor profile IDs to dispatch to' })
  @IsString({ each: true })
  vendorProfileIds!: string[];

  @ApiPropertyOptional({ description: 'Response deadline in minutes (default: 30)' })
  @IsOptional()
  @IsNumber()
  responseDeadlineMinutes?: number;
}
