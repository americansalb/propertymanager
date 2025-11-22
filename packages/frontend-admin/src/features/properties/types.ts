/**
 * Shared types for properties feature
 * Mirrors backend enums and DTOs
 */

export enum PropertyType {
  SINGLE_FAMILY = 'SINGLE_FAMILY',
  MULTIFAMILY = 'MULTIFAMILY',
  COMMERCIAL = 'COMMERCIAL',
  MIXED_USE = 'MIXED_USE',
  STUDENT_HOUSING = 'STUDENT_HOUSING',
  SENIOR_LIVING = 'SENIOR_LIVING',
}

export enum PropertyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNDER_CONSTRUCTION = 'UNDER_CONSTRUCTION',
}
