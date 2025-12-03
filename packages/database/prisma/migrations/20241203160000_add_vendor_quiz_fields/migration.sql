-- Add vendor quiz funnel fields
ALTER TABLE "Vendor" ADD COLUMN "dbaName" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "website" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "yearsInBusiness" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "numberOfTechnicians" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "businessEntityType" TEXT;

-- Licensing fields
ALTER TABLE "Vendor" ADD COLUMN "licenseState" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "licenseType" TEXT;

-- Insurance fields
ALTER TABLE "Vendor" ADD COLUMN "insuranceCarrier" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "insurancePolicyNumber" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "insuranceCoverageAmount" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "insuranceAgentName" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "insuranceAgentPhone" TEXT;

-- Trade certifications
ALTER TABLE "Vendor" ADD COLUMN "certificationNumber" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "bondCompany" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "bondAmount" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "bondExpiryDate" TIMESTAMP(3);

-- Services & Coverage
ALTER TABLE "Vendor" ADD COLUMN "servicesOffered" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Vendor" ADD COLUMN "serviceZipCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Vendor" ADD COLUMN "serviceRadius" INTEGER;
ALTER TABLE "Vendor" ADD COLUMN "emergencyAvailable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN "emergencyResponseTime" INTEGER;
