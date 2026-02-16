-- AlterEnum: remove old values, add UNPAID
-- Step 1: Update existing invoices with old statuses to UNPAID
UPDATE "Invoice" SET "status" = 'DRAFT' WHERE "status" IN ('SENT', 'CANCELLED');

-- Step 2: Rename old enum type
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";

-- Step 3: Create new enum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

-- Step 4: Update column to use new enum, mapping DRAFT -> UNPAID
ALTER TABLE "Invoice" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE "InvoiceStatus" USING (
  CASE
    WHEN "status"::text = 'DRAFT' THEN 'UNPAID'::text
    WHEN "status"::text = 'PARTIALLY_PAID' THEN 'PARTIALLY_PAID'::text
    WHEN "status"::text = 'PAID' THEN 'PAID'::text
    ELSE 'UNPAID'::text
  END
)::"InvoiceStatus";
ALTER TABLE "Invoice" ALTER COLUMN "status" SET DEFAULT 'UNPAID';

-- Step 5: Drop old enum
DROP TYPE "InvoiceStatus_old";
