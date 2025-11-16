/**
 * Financial domain types
 */

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netOperatingIncome: number;
  accountsReceivable: number;
  accountsPayable: number;
  cashBalance: number;
  occupancyRate: number;
}

export interface PropertyFinancials {
  propertyId: string;
  propertyName: string;
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: RevenueBreakdown;
  expenses: ExpenseBreakdown;
  netOperatingIncome: number;
  cashFlow: number;
}

export interface RevenueBreakdown {
  rentalIncome: number;
  lateFees: number;
  parkingIncome: number;
  amenityFees: number;
  otherIncome: number;
  total: number;
}

export interface ExpenseBreakdown {
  maintenance: number;
  utilities: number;
  insurance: number;
  propertyTax: number;
  managementFees: number;
  marketing: number;
  payroll: number;
  other: number;
  total: number;
}

export interface DelinquencyReport {
  propertyId?: string;
  totalDelinquent: number;
  delinquentUnits: number;
  aging: {
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
  };
  tenants: DelinquentTenant[];
}

export interface DelinquentTenant {
  tenantId: string;
  tenantName: string;
  unitNumber: string;
  amountOwed: number;
  daysDelinquent: number;
  lastPaymentDate?: string;
}

export interface BankReconciliation {
  bankAccountId: string;
  accountName: string;
  period: {
    startDate: string;
    endDate: string;
  };
  beginningBalance: number;
  endingBalance: number;
  clearedTransactions: number;
  unclearedTransactions: number;
  reconciledBalance: number;
  difference: number;
  isReconciled: boolean;
}
