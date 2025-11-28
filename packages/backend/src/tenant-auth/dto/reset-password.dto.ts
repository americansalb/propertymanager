import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token received via email' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token!: string;

  @ApiProperty({
    example: 'NewSecurePass123!',
    description:
      'New password must be at least 8 characters with uppercase, lowercase, number, and special character',
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
  newPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword!: string;

  @ApiProperty({
    example: 'NewSecurePass123!',
    description:
      'New password must be at least 8 characters with uppercase, lowercase, number, and special character',
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
  })
  newPassword!: string;
}

export class SetupPortalAccessDto {
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
}
