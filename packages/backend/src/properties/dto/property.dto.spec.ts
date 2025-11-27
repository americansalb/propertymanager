import { validate } from 'class-validator';
import { UpdatePropertyDto, PropertyType } from './property.dto';

/**
 * Unit tests for UpdatePropertyDto validation
 * See: docs/tasks/PROPERTY_EDIT_MODAL_TASKS.md (TASK-020)
 */

const makeValidDto = (): UpdatePropertyDto => {
  const dto = new UpdatePropertyDto();
  dto.name = 'Sunset Villas';
  dto.addressLine1 = '123 Main St';
  dto.addressLine2 = null; // Optional
  dto.city = 'Austin';
  dto.state = 'TX';
  dto.postalCode = '78701';
  dto.country = 'US';
  dto.propertyType = PropertyType.MULTIFAMILY;
  dto.active = true;
  return dto;
};

describe('UpdatePropertyDto', () => {
  it('should accept a valid dto', async () => {
    const dto = makeValidDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should reject missing required fields', async () => {
    const dto = new UpdatePropertyDto();
    const errors = await validate(dto);

    // We expect errors for all required fields
    expect(errors.length).toBeGreaterThan(0);

    // Check that specific required fields are flagged
    const errorProperties = errors.map((e) => e.property);
    expect(errorProperties).toContain('name');
    expect(errorProperties).toContain('addressLine1');
    expect(errorProperties).toContain('city');
    expect(errorProperties).toContain('state');
    expect(errorProperties).toContain('postalCode');
    expect(errorProperties).toContain('country');
    expect(errorProperties).toContain('propertyType');
    expect(errorProperties).toContain('active');
  });

  describe('name validation', () => {
    it('should reject empty name', async () => {
      const dto = makeValidDto();
      dto.name = '';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('should reject name exceeding 120 characters', async () => {
      const dto = makeValidDto();
      dto.name = 'a'.repeat(121);
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('should accept name at max length (120 chars)', async () => {
      const dto = makeValidDto();
      dto.name = 'a'.repeat(120);
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'name')).toHaveLength(0);
    });
  });

  describe('address validation', () => {
    it('should reject empty addressLine1', async () => {
      const dto = makeValidDto();
      dto.addressLine1 = '';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'addressLine1')).toBe(true);
    });

    it('should accept null addressLine2 (optional)', async () => {
      const dto = makeValidDto();
      dto.addressLine2 = null;
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'addressLine2')).toHaveLength(0);
    });

    it('should accept undefined addressLine2 (optional)', async () => {
      const dto = makeValidDto();
      dto.addressLine2 = undefined;
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'addressLine2')).toHaveLength(0);
    });

    it('should reject addressLine2 exceeding 200 characters', async () => {
      const dto = makeValidDto();
      dto.addressLine2 = 'a'.repeat(201);
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'addressLine2')).toBe(true);
    });
  });

  describe('postalCode validation', () => {
    it('should accept valid US 5-digit postal code', async () => {
      const dto = makeValidDto();
      dto.postalCode = '78701';
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'postalCode')).toHaveLength(0);
    });

    it('should accept valid US 9-digit postal code', async () => {
      const dto = makeValidDto();
      dto.postalCode = '78701-1234';
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'postalCode')).toHaveLength(0);
    });

    it('should accept Canadian postal code format', async () => {
      const dto = makeValidDto();
      dto.postalCode = 'M5H 2N2'; // Toronto format
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'postalCode')).toHaveLength(0);
    });

    it('should reject invalid postal code with special characters', async () => {
      const dto = makeValidDto();
      dto.postalCode = '!!!';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'postalCode')).toBe(true);
    });

    it('should reject postal code too short (less than 3 chars)', async () => {
      const dto = makeValidDto();
      dto.postalCode = '12';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'postalCode')).toBe(true);
    });

    it('should reject postal code too long (more than 16 chars)', async () => {
      const dto = makeValidDto();
      dto.postalCode = '12345678901234567';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'postalCode')).toBe(true);
    });
  });

  describe('state validation', () => {
    it('should accept 2-letter state code', async () => {
      const dto = makeValidDto();
      dto.state = 'CA';
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'state')).toHaveLength(0);
    });

    it('should accept full state names', async () => {
      const dto = makeValidDto();
      dto.state = 'California';
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'state')).toHaveLength(0);
    });

    it('should reject empty state', async () => {
      const dto = makeValidDto();
      dto.state = '';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'state')).toBe(true);
    });
  });

  describe('country validation', () => {
    it('should accept US', async () => {
      const dto = makeValidDto();
      dto.country = 'US';
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'country')).toHaveLength(0);
    });

    it('should accept other 2-letter country codes', async () => {
      const dto = makeValidDto();
      dto.country = 'CA';
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'country')).toHaveLength(0);
    });

    it('should reject country code longer than 2 characters', async () => {
      const dto = makeValidDto();
      dto.country = 'USA'; // 3 characters
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'country')).toBe(true);
    });
  });

  describe('propertyType validation', () => {
    it('should accept valid PropertyType enum values', async () => {
      const validTypes = [
        PropertyType.SINGLE_FAMILY,
        PropertyType.MULTIFAMILY,
        PropertyType.COMMERCIAL,
        PropertyType.MIXED_USE,
        PropertyType.STUDENT_HOUSING,
        PropertyType.SENIOR_LIVING,
      ];

      for (const type of validTypes) {
        const dto = makeValidDto();
        dto.propertyType = type;
        const errors = await validate(dto);
        expect(errors.filter((e) => e.property === 'propertyType')).toHaveLength(0);
      }
    });

    it('should reject invalid propertyType', async () => {
      const dto = makeValidDto();
      (dto as any).propertyType = 'INVALID_TYPE';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'propertyType')).toBe(true);
    });
  });

  // NOTE: 'notes' field removed - not in Prisma schema
  // If notes field is added to schema.prisma, add validation tests here

  describe('active validation', () => {
    it('should accept true for active', async () => {
      const dto = makeValidDto();
      dto.active = true;
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'active')).toHaveLength(0);
    });

    it('should accept false for active', async () => {
      const dto = makeValidDto();
      dto.active = false;
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'active')).toHaveLength(0);
    });

    it('should reject non-boolean active', async () => {
      const dto = makeValidDto();
      (dto as any).active = 'yes';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'active')).toBe(true);
    });
  });

  describe('comprehensive validation', () => {
    it('should accept a fully populated valid dto', async () => {
      const dto = makeValidDto();
      dto.addressLine2 = 'Suite 100';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should collect multiple validation errors at once', async () => {
      const dto = new UpdatePropertyDto();
      dto.name = ''; // Invalid (empty)
      dto.postalCode = '!!!'; // Invalid (special chars)
      dto.active = 'yes' as any; // Invalid (not boolean)

      const errors = await validate(dto);

      // Should have errors for multiple fields
      expect(errors.length).toBeGreaterThan(3);

      const errorProperties = new Set(errors.map((e) => e.property));
      expect(errorProperties.has('name')).toBe(true);
      expect(errorProperties.has('postalCode')).toBe(true);
      expect(errorProperties.has('active')).toBe(true);
    });
  });
});
