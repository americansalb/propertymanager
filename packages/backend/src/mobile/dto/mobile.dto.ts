import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  IsEnum,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum DevicePlatform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
}

// Device DTOs
export class RegisterDeviceDto {
  @ApiProperty()
  @IsString()
  deviceId!: string;

  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ enum: DevicePlatform })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}

export class SendPushNotificationDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  userIds!: string[];

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  badge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sound?: string;
}

// API Key DTOs
export class CreateApiKeyDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  rateLimitPerMinute?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000000)
  @Type(() => Number)
  rateLimitPerDay?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIps?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedOrigins?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Type(() => Number)
  expiresInDays?: number;
}

export class UpdateApiKeyDto extends PartialType(CreateApiKeyDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// Refresh Token DTOs
export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

// Mobile App Config
export class MobileAppConfigDto {
  @ApiProperty()
  @IsString()
  appVersion!: string;

  @ApiProperty()
  @IsString()
  minVersion!: string;

  @ApiProperty()
  @IsBoolean()
  forceUpdate!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  updateUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @ApiProperty()
  features!: {
    pushNotifications: boolean;
    biometricAuth: boolean;
    offlineMode: boolean;
    darkMode: boolean;
  };
}
