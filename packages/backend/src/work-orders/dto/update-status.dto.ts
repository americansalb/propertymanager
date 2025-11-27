import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { WorkOrderStatus } from './create-work-order.dto';

export class UpdateWorkOrderStatusDto {
  @ApiProperty({ enum: WorkOrderStatus, description: 'New status' })
  @IsEnum(WorkOrderStatus)
  status: WorkOrderStatus;

  @ApiPropertyOptional({ description: 'Notes about the status change' })
  @IsString()
  @IsOptional()
  notes?: string;
}
