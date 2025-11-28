/**
 * Authentication & Authorization types
 */

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  organizationId: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string; // Optional - now stored in httpOnly cookie
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  organizationName: string;
  avatarUrl?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  organizationName: string;
  organizationType: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Permissions matrix
export enum Permission {
  // Properties
  VIEW_PROPERTIES = 'view:properties',
  CREATE_PROPERTIES = 'create:properties',
  EDIT_PROPERTIES = 'edit:properties',
  DELETE_PROPERTIES = 'delete:properties',

  // Financial
  VIEW_FINANCIALS = 'view:financials',
  CREATE_TRANSACTIONS = 'create:transactions',
  APPROVE_BILLS = 'approve:bills',
  PROCESS_PAYMENTS = 'process:payments',
  VIEW_BANK_ACCOUNTS = 'view:bank_accounts',

  // Leasing
  VIEW_LEASES = 'view:leases',
  CREATE_LEASES = 'create:leases',
  EDIT_LEASES = 'edit:leases',
  TERMINATE_LEASES = 'terminate:leases',

  // Operations
  VIEW_WORK_ORDERS = 'view:work_orders',
  CREATE_WORK_ORDERS = 'create:work_orders',
  ASSIGN_WORK_ORDERS = 'assign:work_orders',
  COMPLETE_WORK_ORDERS = 'complete:work_orders',

  // Admin
  MANAGE_USERS = 'manage:users',
  MANAGE_ORGANIZATION = 'manage:organization',
  VIEW_AUDIT_LOGS = 'view:audit_logs',
}

// Role-based permissions
export const RolePermissions: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission),
  ORGANIZATION_ADMIN: Object.values(Permission).filter((p) => !p.startsWith('manage:organization')),
  PROPERTY_MANAGER: [
    Permission.VIEW_PROPERTIES,
    Permission.EDIT_PROPERTIES,
    Permission.VIEW_FINANCIALS,
    Permission.CREATE_TRANSACTIONS,
    Permission.APPROVE_BILLS,
    Permission.VIEW_LEASES,
    Permission.CREATE_LEASES,
    Permission.EDIT_LEASES,
    Permission.VIEW_WORK_ORDERS,
    Permission.CREATE_WORK_ORDERS,
    Permission.ASSIGN_WORK_ORDERS,
  ],
  ACCOUNTANT: [
    Permission.VIEW_PROPERTIES,
    Permission.VIEW_FINANCIALS,
    Permission.CREATE_TRANSACTIONS,
    Permission.APPROVE_BILLS,
    Permission.PROCESS_PAYMENTS,
    Permission.VIEW_BANK_ACCOUNTS,
  ],
  LEASING_AGENT: [
    Permission.VIEW_PROPERTIES,
    Permission.VIEW_LEASES,
    Permission.CREATE_LEASES,
    Permission.EDIT_LEASES,
    Permission.VIEW_WORK_ORDERS,
    Permission.CREATE_WORK_ORDERS,
  ],
  MAINTENANCE_TECH: [Permission.VIEW_WORK_ORDERS, Permission.COMPLETE_WORK_ORDERS],
  TENANT: [Permission.VIEW_WORK_ORDERS, Permission.CREATE_WORK_ORDERS],
  VENDOR: [Permission.VIEW_WORK_ORDERS, Permission.COMPLETE_WORK_ORDERS],
};
