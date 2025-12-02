import { IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum JobStatus {
  AVAILABLE = 'AVAILABLE', // Dispatched, awaiting response
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export class VendorJobQueryDto {
  @ApiPropertyOptional({ description: 'Filter by job status' })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ description: 'Maximum distance in miles (based on vendor service radius)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxDistance?: number;

  @ApiPropertyOptional({ description: 'Minimum estimated pay' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minPay?: number;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}

export class DeclineJobDto {
  @ApiPropertyOptional({ description: 'Reason for declining the job' })
  @IsOptional()
  reason?: string;
}
