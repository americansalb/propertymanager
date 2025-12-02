import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VendorType {
  MAINTENANCE = 'MAINTENANCE',
  LANDSCAPING = 'LANDSCAPING',
  CLEANING = 'CLEANING',
  PLUMBING = 'PLUMBING',
  ELECTRICAL = 'ELECTRICAL',
  HVAC = 'HVAC',
  GENERAL_CONTRACTOR = 'GENERAL_CONTRACTOR',
  SUPPLIER = 'SUPPLIER',
  UTILITY = 'UTILITY',
  PROFESSIONAL_SERVICES = 'PROFESSIONAL_SERVICES',
  OTHER = 'OTHER',
}

export enum VendorStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
}

export class CreateVendorDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @MaxLength(255)
  companyName!: string;

  @ApiPropertyOptional({ description: 'Contact person name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ enum: VendorType, description: 'Type of vendor' })
  @IsEnum(VendorType)
  type!: VendorType;

  @ApiPropertyOptional({ enum: VendorStatus, description: 'Vendor status' })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @ApiPropertyOptional({ description: 'Street address line 1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address1?: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address2?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @ApiPropertyOptional({ description: 'ZIP code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @ApiPropertyOptional({ description: 'Tax ID (EIN)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  @ApiPropertyOptional({ description: 'W9 document URL' })
  @IsOptional()
  @IsString()
  w9Url?: string;

  @ApiPropertyOptional({ description: 'Payment terms (e.g., Net 30)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentTerms?: string;

  @ApiPropertyOptional({ description: 'Insurance expiry date' })
  @IsOptional()
  @IsDateString()
  insuranceExpiryDate?: string;

  @ApiPropertyOptional({ description: 'Insurance certificate URL' })
  @IsOptional()
  @IsString()
  insuranceCertUrl?: string;

  @ApiPropertyOptional({ description: 'License number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;

  @ApiPropertyOptional({ description: 'Notes about the vendor' })
  @IsOptional()
  @IsString()
  notes?: string;
}
