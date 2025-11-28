import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description:
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
  })
  password!: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;

  @ApiPropertyOptional({ example: '+1-555-0100', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Acme Property Management', description: 'Organization name' })
  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  organizationName!: string;

  @ApiProperty({
    example: 'PROPERTY_MANAGER',
    enum: ['PROPERTY_MANAGER', 'OWNER_OPERATOR', 'ENTERPRISE'],
    description: 'Type of organization',
  })
  @IsString()
  @IsNotEmpty({ message: 'Organization type is required' })
  @IsEnum(['PROPERTY_MANAGER', 'OWNER_OPERATOR', 'ENTERPRISE'], {
    message: 'Organization type must be PROPERTY_MANAGER, OWNER_OPERATOR, or ENTERPRISE',
  })
  organizationType!: string;
}
