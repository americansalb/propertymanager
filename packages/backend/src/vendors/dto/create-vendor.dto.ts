import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsBoolean,
  IsArray,
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
  LOCKSMITH = 'LOCKSMITH',
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
  // Basic Info
  @ApiProperty({ description: 'Company name' })
  @IsString()
  @MaxLength(255)
  companyName!: string;

  @ApiPropertyOptional({ description: 'DBA/Trade name if different' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  dbaName?: string;

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

  @ApiPropertyOptional({ description: 'Website URL' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ enum: VendorType, description: 'Type of vendor' })
  @IsEnum(VendorType)
  type!: VendorType;

  @ApiPropertyOptional({ enum: VendorStatus, description: 'Vendor status' })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @ApiPropertyOptional({ description: 'Years in business' })
  @IsOptional()
  @IsString()
  yearsInBusiness?: string;

  @ApiPropertyOptional({ description: 'Number of technicians' })
  @IsOptional()
  @IsString()
  numberOfTechnicians?: string;

  // Address
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

  // Tax & Payment
  @ApiPropertyOptional({ description: 'Business entity type (LLC, Corp, etc.)' })
  @IsOptional()
  @IsString()
  businessEntityType?: string;

  @ApiPropertyOptional({ description: 'Tax ID (EIN or SSN)' })
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

  // Insurance (CRITICAL)
  @ApiPropertyOptional({ description: 'Insurance carrier name' })
  @IsOptional()
  @IsString()
  insuranceCarrier?: string;

  @ApiPropertyOptional({ description: 'Insurance policy number' })
  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;

  @ApiPropertyOptional({ description: 'Insurance coverage amount' })
  @IsOptional()
  @IsString()
  insuranceCoverageAmount?: string;

  @ApiPropertyOptional({ description: 'Insurance expiry date' })
  @IsOptional()
  @IsDateString()
  insuranceExpiryDate?: string;

  @ApiPropertyOptional({ description: 'Insurance certificate URL' })
  @IsOptional()
  @IsString()
  insuranceCertUrl?: string;

  @ApiPropertyOptional({ description: 'Insurance agent name (for verification)' })
  @IsOptional()
  @IsString()
  insuranceAgentName?: string;

  @ApiPropertyOptional({ description: 'Insurance agent phone (for verification)' })
  @IsOptional()
  @IsString()
  insuranceAgentPhone?: string;

  // License (CRITICAL)
  @ApiPropertyOptional({ description: 'License number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseNumber?: string;

  @ApiPropertyOptional({ description: 'License state' })
  @IsOptional()
  @IsString()
  licenseState?: string;

  @ApiPropertyOptional({ description: 'License type' })
  @IsOptional()
  @IsString()
  licenseType?: string;

  @ApiPropertyOptional({ description: 'License expiry date' })
  @IsOptional()
  @IsDateString()
  licenseExpiryDate?: string;

  // Professional certifications (trade-specific)
  @ApiPropertyOptional({ description: 'Professional certification number (ALOA, etc.)' })
  @IsOptional()
  @IsString()
  certificationNumber?: string;

  @ApiPropertyOptional({ description: 'Bonding company' })
  @IsOptional()
  @IsString()
  bondCompany?: string;

  @ApiPropertyOptional({ description: 'Bond amount' })
  @IsOptional()
  @IsString()
  bondAmount?: string;

  @ApiPropertyOptional({ description: 'Bond expiry date' })
  @IsOptional()
  @IsDateString()
  bondExpiryDate?: string;

  // Background check
  @ApiPropertyOptional({ description: 'Background check consent' })
  @IsOptional()
  @IsBoolean()
  backgroundCheckConsent?: boolean;

  // Service details
  @ApiPropertyOptional({ description: 'Services offered (JSON array)' })
  @IsOptional()
  @IsArray()
  servicesOffered?: string[];

  @ApiPropertyOptional({ description: 'Service ZIP codes (JSON array)' })
  @IsOptional()
  @IsArray()
  serviceZipCodes?: string[];

  @ApiPropertyOptional({ description: 'Service radius in miles' })
  @IsOptional()
  @IsNumber()
  serviceRadius?: number;

  @ApiPropertyOptional({ description: 'Emergency availability' })
  @IsOptional()
  @IsBoolean()
  emergencyAvailable?: boolean;

  @ApiPropertyOptional({ description: 'Emergency response time in minutes' })
  @IsOptional()
  @IsNumber()
  emergencyResponseTime?: number;

  @ApiPropertyOptional({ description: 'Notes about the vendor' })
  @IsOptional()
  @IsString()
  notes?: string;
}
