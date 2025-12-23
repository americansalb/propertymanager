-- Change cascade deletes to restrict for data integrity protection
-- This prevents accidental data loss when deleting parent records

-- Unit -> Property: Prevent deleting property with units
ALTER TABLE "Unit" DROP CONSTRAINT "Unit_propertyId_fkey";
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- JournalEntry -> Transaction: Protect financial audit trail
ALTER TABLE "JournalEntry" DROP CONSTRAINT "JournalEntry_transactionId_fkey";
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Charge -> Lease: Prevent deleting lease with charges (financial data protection)
ALTER TABLE "Charge" DROP CONSTRAINT "Charge_leaseId_fkey";
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PaymentAllocation -> Payment: Protect payment allocation records
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT "PaymentAllocation_paymentId_fkey";
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PaymentAllocation -> Charge: Protect payment allocation records
ALTER TABLE "PaymentAllocation" DROP CONSTRAINT "PaymentAllocation_chargeId_fkey";
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
