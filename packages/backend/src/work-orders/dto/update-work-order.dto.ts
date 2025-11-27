import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkOrderType, WorkOrderPriority, WorkOrderStatus } from './create-work-order.dto';

export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ description: 'Work order title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Detailed description of the work order' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: WorkOrderType, description: 'Type of work order' })
  @IsEnum(WorkOrderType)
  @IsOptional()
  type?: WorkOrderType;

  @ApiPropertyOptional({ enum: WorkOrderPriority, description: 'Priority level' })
  @IsEnum(WorkOrderPriority)
  @IsOptional()
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ enum: WorkOrderStatus, description: 'Work order status' })
  @IsEnum(WorkOrderStatus)
  @IsOptional()
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ description: 'Unit ID if work is for a specific unit' })
  @IsString()
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({ description: 'Specific location (e.g., Lobby, Roof)' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'User ID to assign work order to' })
  @IsString()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Vendor ID to assign work order to' })
  @IsString()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Scheduled date for work' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Estimated cost of work' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Actual cost of work' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  actualCost?: number;

  @ApiPropertyOptional({ description: 'Name of tenant who reported the issue' })
  @IsString()
  @IsOptional()
  tenantReportedBy?: string;

  @ApiPropertyOptional({ description: 'Tenant contact phone' })
  @IsString()
  @IsOptional()
  tenantPhone?: string;

  @ApiPropertyOptional({ description: 'Permission to enter unit' })
  @IsBoolean()
  @IsOptional()
  permissionToEnter?: boolean;

  @ApiPropertyOptional({ description: 'Notes upon completion' })
  @IsString()
  @IsOptional()
  completionNotes?: string;
}
