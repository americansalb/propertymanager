import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkOrderStatus, WorkOrderPriority, WorkOrderType } from './create-work-order.dto';

export class WorkOrderQueryDto {
  @ApiPropertyOptional({ enum: WorkOrderStatus, description: 'Filter by status' })
  @IsEnum(WorkOrderStatus)
  @IsOptional()
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ enum: WorkOrderPriority, description: 'Filter by priority' })
  @IsEnum(WorkOrderPriority)
  @IsOptional()
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ enum: WorkOrderType, description: 'Filter by type' })
  @IsEnum(WorkOrderType)
  @IsOptional()
  type?: WorkOrderType;

  @ApiPropertyOptional({ description: 'Filter by property ID' })
  @IsString()
  @IsOptional()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Filter by unit ID' })
  @IsString()
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({ description: 'Filter by vendor ID' })
  @IsString()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsString()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
