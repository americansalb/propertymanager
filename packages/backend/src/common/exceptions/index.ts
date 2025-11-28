/**
 * Custom Business Exceptions for PropertyMaster
 *
 * These exceptions provide domain-specific error handling with consistent
 * error codes and messages for the frontend to consume.
 */

export { EntityNotFoundException } from './entity-not-found.exception';
export { EntityConflictException } from './entity-conflict.exception';
export { PropertyHasUnitsException } from './property-has-units.exception';
export { LeaseOverlapException } from './lease-overlap.exception';
export { InsufficientBalanceException } from './insufficient-balance.exception';
export { PaymentFailedException } from './payment-failed.exception';
export { TenantAlreadyExistsException } from './tenant-already-exists.exception';
export { UnitHasActiveLeaseException } from './unit-has-active-lease.exception';
export { InvalidLeaseStatusException } from './invalid-lease-status.exception';
export { UnauthorizedOrganizationException } from './unauthorized-organization.exception';
