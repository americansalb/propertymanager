import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class AssignWorkOrderDto {
  @ApiPropertyOptional({ description: 'Vendor ID to assign work order to' })
  @IsString()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'User ID to assign work order to' })
  @IsString()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Scheduled date for work' })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Notes about the assignment' })
  @IsString()
  @IsOptional()
  notes?: string;
}
