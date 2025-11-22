import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'property_created', description: 'Event name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'property_management', description: 'Event category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    example: { propertyId: 'prop_123', propertyType: 'MULTIFAMILY' },
    description: 'Event-specific metadata',
  })
  @IsObject()
  @IsOptional()
  properties?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Session ID for tracking user sessions' })
  @IsString()
  @IsOptional()
  sessionId?: string;
}
