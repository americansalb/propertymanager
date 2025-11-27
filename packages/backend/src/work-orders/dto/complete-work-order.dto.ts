import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CompleteWorkOrderDto {
  @ApiPropertyOptional({ description: 'Actual cost of work' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  actualCost?: number;

  @ApiPropertyOptional({ description: 'Notes upon completion' })
  @IsString()
  @IsOptional()
  completionNotes?: string;
}
