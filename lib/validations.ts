import { z } from "zod";

// ─── Helpers ───────────────────────────────────────────────────────

/** Strip HTML tags and trim whitespace */
function sanitize(val: string): string {
  return val.replace(/<[^>]*>/g, "").trim();
}

/** Zod preprocess: trim + strip HTML for strings */
const sanitizedString = z.string().transform(sanitize);

/** Non-empty sanitized string with min/max */
function requiredString(min: number, max: number) {
  return sanitizedString.pipe(
    z.string().min(min, `Must be at least ${min} character(s)`).max(max, `Must be at most ${max} characters`)
  );
}

/** Optional sanitized string with max */
function optionalString(max: number) {
  return z
    .string()
    .optional()
    .transform((val) => (val ? sanitize(val) : undefined))
    .pipe(z.string().max(max, `Must be at most ${max} characters`).optional());
}

/** Non-empty string ID */
const requiredId = sanitizedString.pipe(z.string().min(1, "ID is required"));

/** Valid ISO date string */
const dateString = sanitizedString.pipe(
  z.string().min(1, "Date is required").refine(
    (val) => !isNaN(new Date(val).getTime()),
    "Invalid date"
  )
);

/** Optional valid ISO date string */
const optionalDateString = z
  .string()
  .optional()
  .transform((val) => (val ? sanitize(val) : undefined))
  .pipe(
    z
      .string()
      .refine((val) => !isNaN(new Date(val).getTime()), "Invalid date")
      .optional()
  );

// ─── Unit enum ─────────────────────────────────────────────────────

const unitEnum = z.enum(["NOS", "KG", "MTR", "SET", "LOT"]);

// ─── Purchase Order ────────────────────────────────────────────────

const lineItemSchema = z.object({
  partNumber: requiredString(1, 50),
  partName: requiredString(1, 200),
  workOrder: optionalString(50),
  qtyOrdered: z.number().int("Must be a whole number").min(1, "Min qty is 1").max(999999, "Max qty is 999999"),
  rate: z.number().min(0.01, "Min rate is 0.01").max(99999999, "Max rate is 99999999"),
  unit: unitEnum,
});

export const createPurchaseOrderSchema = z.object({
  poNumber: requiredString(1, 100),
  divisionId: requiredId,
  date: dateString,
  deliveryDate: optionalDateString,
  remarks: optionalString(500),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

export const updatePurchaseOrderSchema = z.object({
  id: requiredId,
  data: z.object({
    poNumber: optionalString(100),
    divisionId: z
      .string()
      .optional()
      .transform((val) => (val ? sanitize(val) : undefined)),
    date: optionalDateString,
    deliveryDate: optionalDateString,
    remarks: z
      .string()
      .optional()
      .transform((val) => (val !== undefined ? sanitize(val) : undefined))
      .pipe(z.string().max(500).optional()),
    status: z.enum(["CANCELLED"]).optional(),
  }),
});

export const deletePurchaseOrderSchema = z.object({
  id: requiredId,
});

// ─── Inward Gate Pass ──────────────────────────────────────────────

export const createInwardGatePassSchema = z.object({
  gpNumber: requiredString(1, 50),
  date: dateString,
  purchaseOrderId: requiredId,
  poLineItemId: requiredId,
  batchNumber: optionalString(50),
  qty: z.number().int("Must be a whole number").min(1, "Min qty is 1"),
  vehicleNumber: optionalString(20),
  challanNumber: optionalString(50),
});

// ─── Outward Gate Pass ─────────────────────────────────────────────

export const createOutwardGatePassSchema = z.object({
  gpNumber: requiredString(1, 50),
  date: dateString,
  purchaseOrderId: requiredId,
  poLineItemId: requiredId,
  batchNumber: optionalString(50),
  qty: z.number().int("Must be a whole number").min(1, "Min qty is 1"),
  vehicleNumber: optionalString(20),
  challanNumber: optionalString(50),
  dispatchDate: optionalDateString,
});

// ─── Invoice ───────────────────────────────────────────────────────

const invoiceItemSchema = z.object({
  poLineItemId: requiredId,
  qty: z.number().min(0.01, "Qty must be positive"),
  rate: z.number().min(0.01, "Rate must be positive"),
});

export const createInvoiceSchema = z.object({
  purchaseOrderId: requiredId,
  date: dateString,
  remarks: optionalString(500),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

// ─── Payment ───────────────────────────────────────────────────────

const paymentModeEnum = z.enum(["NEFT", "RTGS", "CHEQUE", "UPI", "CASH"]);

export const recordPaymentSchema = z.object({
  invoiceId: requiredId,
  amount: z.number().min(0.01, "Min amount is 0.01"),
  date: dateString,
  mode: paymentModeEnum.optional(),
  reference: optionalString(100),
  remarks: optionalString(500),
});

// ─── Division ──────────────────────────────────────────────────────

export const createDivisionSchema = z.object({
  name: requiredString(1, 100),
  code: requiredString(1, 10).pipe(z.string().transform((val) => val.toUpperCase())),
});

export const updateDivisionSchema = z.object({
  id: requiredId,
  data: z.object({
    name: requiredString(1, 100),
    code: requiredString(1, 10).pipe(z.string().transform((val) => val.toUpperCase())),
  }),
});

export const deleteDivisionSchema = z.object({
  id: requiredId,
});

// ─── Invoice status update ─────────────────────────────────────────

export const updatePaymentStatusSchema = z.object({
  invoiceId: requiredId,
  status: z.enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "CANCELLED"]),
});

// ─── PO Ledger Filters ────────────────────────────────────────────

export const poLedgerFiltersSchema = z.object({
  divisionId: z
    .string()
    .optional()
    .transform((val) => (val ? sanitize(val) : undefined)),
  status: z.enum(["ALL", "OPEN", "PARTIALLY_FULFILLED", "COMPLETED"]).optional(),
  dateFrom: optionalDateString,
  dateTo: optionalDateString,
});

// ─── Search queries ────────────────────────────────────────────────

export const searchQuerySchema = z.object({
  query: sanitizedString.pipe(z.string().max(200)),
});

// ─── Get by ID ─────────────────────────────────────────────────────

export const getByIdSchema = z.object({
  id: requiredId,
});
