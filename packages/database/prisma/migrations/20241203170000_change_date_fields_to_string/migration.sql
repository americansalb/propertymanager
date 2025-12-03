-- Change date fields from DateTime to String to match frontend format
-- Frontend sends dates as "YYYY-MM-DD" strings from HTML input type="date"

-- Convert existing TIMESTAMP columns to TEXT
ALTER TABLE "Vendor" ALTER COLUMN "licenseExpiryDate" TYPE TEXT USING CAST("licenseExpiryDate" AS TEXT);
ALTER TABLE "Vendor" ALTER COLUMN "insuranceExpiryDate" TYPE TEXT USING CAST("insuranceExpiryDate" AS TEXT);
ALTER TABLE "Vendor" ALTER COLUMN "bondExpiryDate" TYPE TEXT USING CAST("bondExpiryDate" AS TEXT);
