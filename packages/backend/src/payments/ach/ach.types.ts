/**
 * ACH Payment Types - Provider-agnostic interfaces
 * Swap providers by changing ACH_PROVIDER env var:
 * - 'square' (default, $1/transaction)
 * - 'dwolla' ($0.25/transaction)
 * - 'moov' ($0.25/transaction)
 * - 'stripe' ($5/transaction, fallback)
 */

export type AchProvider = 'square' | 'dwolla' | 'moov' | 'stripe';

export interface AchBankAccount {
  id: string;
  accountType: 'checking' | 'savings';
  bankName: string;
  last4: string;
  holderName: string;
  status: 'pending' | 'verified' | 'failed';
  createdAt: Date;
}

export interface AchTransferRequest {
  amount: number;
  sourceBankAccountId: string;
  tenantId: string;
  chargeIds: string[];
  metadata?: Record<string, string>;
}

export interface AchTransferResult {
  transferId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  estimatedArrival?: Date;
  provider: AchProvider;
  providerTransferId: string;
}

export interface AchRefundResult {
  refundId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  originalTransferId: string;
}

export interface AchVerificationResult {
  bankAccountId: string;
  status: 'pending' | 'verified' | 'failed';
  verificationMethod: 'micro_deposits' | 'instant' | 'plaid';
}

export interface AchProviderConfig {
  provider: AchProvider;
  isConfigured: boolean;
  supportedFeatures: {
    instantVerification: boolean;
    microDeposits: boolean;
    sameDay: boolean;
    recurringPayments: boolean;
  };
}

/**
 * Abstract ACH Service Interface
 * All providers must implement this interface
 */
export interface IAchService {
  // Configuration
  getProvider(): AchProvider;
  isConfigured(): boolean;
  getConfig(): AchProviderConfig;

  // Bank Account Management
  createBankAccount(
    tenantId: string,
    accountNumber: string,
    routingNumber: string,
    accountType: 'checking' | 'savings',
    holderName: string,
  ): Promise<AchBankAccount>;

  getBankAccount(bankAccountId: string): Promise<AchBankAccount | null>;

  deleteBankAccount(bankAccountId: string): Promise<boolean>;

  // Verification
  initiateMicroDeposits(bankAccountId: string): Promise<AchVerificationResult>;

  verifyMicroDeposits(
    bankAccountId: string,
    amount1: number,
    amount2: number,
  ): Promise<AchVerificationResult>;

  // Transfers
  initiateTransfer(request: AchTransferRequest): Promise<AchTransferResult>;

  getTransferStatus(transferId: string): Promise<AchTransferResult>;

  cancelTransfer(transferId: string): Promise<boolean>;

  // Refunds
  initiateRefund(
    originalTransferId: string,
    amount?: number,
  ): Promise<AchRefundResult>;
}
