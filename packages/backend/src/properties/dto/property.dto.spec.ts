import { validate } from 'class-validator';
import { UpdatePropertyDto, PropertyType, PropertyStatus } from './property.dto';

/**
 * Unit tests for UpdatePropertyDto validation
 */

const makeValidDto = (): UpdatePropertyDto => {
  const dto = new UpdatePropertyDto();
  dto.name = 'Sunset Villas';
  dto.address1 = '123 Main St';
  dto.address2 = null; // Optional
  dto.city = 'Austin';
  dto.state = 'TX';
  dto.zipCode = '78701';
  dto.country = 'US';
  dto.type = PropertyType.MULTIFAMILY;
  dto.status = PropertyStatus.ACTIVE;
  dto.totalUnits = 10;
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
    expect(errorProperties).toContain('address1');
    expect(errorProperties).toContain('city');
    expect(errorProperties).toContain('state');
    expect(errorProperties).toContain('zipCode');
    expect(errorProperties).toContain('country');
    expect(errorProperties).toContain('type');
    expect(errorProperties).toContain('status');
    expect(errorProperties).toContain('totalUnits');
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
    it('should reject empty address1', async () => {
      const dto = makeValidDto();
      dto.address1 = '';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'address1')).toBe(true);
    });

    it('should accept null address2 (optional)', async () => {
      const dto = makeValidDto();
      dto.address2 = null;
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'address2')).toHaveLength(0);
    });

    it('should accept undefined address2 (optional)', async () => {
      const dto = makeValidDto();
      dto.address2 = undefined;
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'address2')).toHaveLength(0);
    });

    it('should reject address2 exceeding 200 characters', async () => {
      const dto = makeValidDto();
      dto.address2 = 'a'.repeat(201);
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'address2')).toBe(true);
    });
  });

  describe('zipCode validation', () => {
    it('should accept valid US 5-digit postal code', async () => {
      const dto = makeValidDto();
      dto.zipCode = '78701';
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'zipCode')).toHaveLength(0);
    });

    it('should accept valid US 9-digit postal code', async () => {
      const dto = makeValidDto();
      dto.zipCode = '78701-1234';
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'zipCode')).toHaveLength(0);
    });

    it('should accept Canadian postal code format', async () => {
      const dto = makeValidDto();
      dto.zipCode = 'M5H 2N2'; // Toronto format
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'zipCode')).toHaveLength(0);
    });

    it('should reject invalid postal code with special characters', async () => {
      const dto = makeValidDto();
      dto.zipCode = '!!!';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'zipCode')).toBe(true);
    });

    it('should reject postal code too short (less than 3 chars)', async () => {
      const dto = makeValidDto();
      dto.zipCode = '12';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'zipCode')).toBe(true);
    });

    it('should reject postal code too long (more than 16 chars)', async () => {
      const dto = makeValidDto();
      dto.zipCode = '12345678901234567';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'zipCode')).toBe(true);
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

  describe('type validation', () => {
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
        dto.type = type;
        const errors = await validate(dto);
        expect(errors.filter((e) => e.property === 'type')).toHaveLength(0);
      }
    });

    it('should reject invalid type', async () => {
      const dto = makeValidDto();
      (dto as any).type = 'INVALID_TYPE';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'type')).toBe(true);
    });
  });

  describe('status validation', () => {
    it('should accept ACTIVE status', async () => {
      const dto = makeValidDto();
      dto.status = PropertyStatus.ACTIVE;
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'status')).toHaveLength(0);
    });

    it('should accept INACTIVE status', async () => {
      const dto = makeValidDto();
      dto.status = PropertyStatus.INACTIVE;
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'status')).toHaveLength(0);
    });

    it('should reject invalid status', async () => {
      const dto = makeValidDto();
      (dto as any).status = 'INVALID';
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'status')).toBe(true);
    });
  });

  describe('comprehensive validation', () => {
    it('should accept a fully populated valid dto', async () => {
      const dto = makeValidDto();
      dto.address2 = 'Suite 100';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should collect multiple validation errors at once', async () => {
      const dto = new UpdatePropertyDto();
      dto.name = ''; // Invalid (empty)
      dto.zipCode = '!!!'; // Invalid (special chars)
      (dto as any).status = 'INVALID'; // Invalid

      const errors = await validate(dto);

      // Should have errors for multiple fields
      expect(errors.length).toBeGreaterThan(3);

      const errorProperties = new Set(errors.map((e) => e.property));
      expect(errorProperties.has('name')).toBe(true);
      expect(errorProperties.has('zipCode')).toBe(true);
      expect(errorProperties.has('status')).toBe(true);
    });
  });
});
