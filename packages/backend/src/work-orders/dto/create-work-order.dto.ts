import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum WorkOrderType {
  MAINTENANCE = 'MAINTENANCE',
  REPAIR = 'REPAIR',
  INSPECTION = 'INSPECTION',
  TURNOVER = 'TURNOVER',
  EMERGENCY = 'EMERGENCY',
  PREVENTIVE = 'PREVENTIVE',
}

export enum WorkOrderPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EMERGENCY = 'EMERGENCY',
}

export enum WorkOrderStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class CreateWorkOrderDto {
  @ApiProperty({ description: 'Work order title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Detailed description of the work order' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ enum: WorkOrderType, description: 'Type of work order' })
  @IsEnum(WorkOrderType)
  type!: WorkOrderType;

  @ApiPropertyOptional({ enum: WorkOrderPriority, description: 'Priority level', default: WorkOrderPriority.MEDIUM })
  @IsEnum(WorkOrderPriority)
  @IsOptional()
  priority?: WorkOrderPriority;

  @ApiProperty({ description: 'Property ID where work is needed' })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

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

  @ApiPropertyOptional({ description: 'Estimated cost of work' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Name of tenant who reported the issue' })
  @IsString()
  @IsOptional()
  tenantReportedBy?: string;

  @ApiPropertyOptional({ description: 'Tenant contact phone' })
  @IsString()
  @IsOptional()
  tenantPhone?: string;

  @ApiPropertyOptional({ description: 'Permission to enter unit', default: false })
  @IsBoolean()
  @IsOptional()
  permissionToEnter?: boolean;
}
