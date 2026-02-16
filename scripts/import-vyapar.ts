/**
 * Vyapar Data Import Script
 *
 * Reads Excel exports from Vyapar accounting software and imports:
 *   - Parties (customers & suppliers)
 *   - Sale Invoices (with line items)
 *   - Purchase Invoices
 *
 * Usage:
 *   npx tsx scripts/import-vyapar.ts --sale-invoices=<file.xlsx> --purchase-invoices=<file.xlsx> --parties=<file.xlsx>
 *
 * Expected column mappings (Vyapar export format):
 *
 * Parties sheet:
 *   Party Name | GSTIN/UIN | Phone | Email | Billing Address | State | State Code | Type | Balance
 *
 * Sale Invoices sheet:
 *   Invoice Number | Invoice Date | Party Name | Invoice Type | Total Amount | Paid Amount | Balance Due | Payment Type | DC Number | Gate Pass No | Gate Pass Date
 *
 * Sale Invoice Items sheet:
 *   Invoice Number | Item Name | Part Name | HSN/SAC | Qty | Unit | Rate | Discount | Amount
 *
 * Purchase Invoices sheet:
 *   Invoice Number | Invoice Date | Party Name | Total Amount | Paid Amount | Balance Due | Payment Type | Description | PO Number | Work Order | Batch Number
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";
import * as path from "path";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// ─── Argument parsing ────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : undefined;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    // Excel serial date
    return XLSX.SSF.parse_date_code(value) as unknown as Date;
  }
  if (typeof value === "string") {
    // Try DD-MM-YYYY
    const parts = value.split(/[-/]/);
    if (parts.length === 3 && parts[0].length === 2) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return new Date(value);
  }
  return new Date();
}

function toDecimal(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value.replace(/,/g, "")) || 0;
  return 0;
}

function readSheet<T>(filePath: string, sheetIndex = 0): T[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[sheetIndex];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: "" });
}

// ─── Import: Parties ─────────────────────────────────────────────────

async function importParties(filePath: string) {
  console.log(`\nImporting parties from: ${filePath}`);

  interface PartyRow {
    "Party Name": string;
    "GSTIN/UIN": string;
    Phone: string;
    Email: string;
    "Billing Address": string;
    State: string;
    "State Code": string;
    Type: string;
    Balance: string | number;
  }

  const rows = readSheet<PartyRow>(filePath);
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = String(row["Party Name"] ?? "").trim();
    if (!name) { skipped++; continue; }

    const rawType = String(row["Type"] ?? "").toLowerCase();
    const type =
      rawType.includes("supplier") ? "SUPPLIER" :
      rawType.includes("customer") ? "CUSTOMER" :
      "BOTH";

    const balance = toDecimal(row["Balance"]);

    await prisma.party.upsert({
      where: { name },
      update: {
        gstin: String(row["GSTIN/UIN"] || "").trim() || undefined,
        phone: String(row["Phone"] || "").trim() || undefined,
        email: String(row["Email"] || "").trim() || undefined,
        address: String(row["Billing Address"] || "").trim() || undefined,
        state: String(row["State"] || "").trim() || undefined,
        stateCode: String(row["State Code"] || "").trim() || undefined,
        type: type as "CUSTOMER" | "SUPPLIER" | "BOTH",
        receivableBalance: type === "CUSTOMER" || type === "BOTH" ? balance : 0,
        payableBalance: type === "SUPPLIER" ? Math.abs(balance) : 0,
      },
      create: {
        name,
        gstin: String(row["GSTIN/UIN"] || "").trim() || undefined,
        phone: String(row["Phone"] || "").trim() || undefined,
        email: String(row["Email"] || "").trim() || undefined,
        address: String(row["Billing Address"] || "").trim() || undefined,
        state: String(row["State"] || "").trim() || undefined,
        stateCode: String(row["State Code"] || "").trim() || undefined,
        type: type as "CUSTOMER" | "SUPPLIER" | "BOTH",
        receivableBalance: type === "CUSTOMER" || type === "BOTH" ? balance : 0,
        payableBalance: type === "SUPPLIER" ? Math.abs(balance) : 0,
      },
    });
    created++;
  }

  console.log(`  Parties: ${created} upserted, ${skipped} skipped`);
}

// ─── Import: Sale Invoices ────────────────────────────────────────────

async function importSaleInvoices(filePath: string) {
  console.log(`\nImporting sale invoices from: ${filePath}`);

  interface InvoiceRow {
    "Invoice Number": string;
    "Invoice Date": string | number;
    "Party Name": string;
    "Invoice Type": string;
    "Total Amount": string | number;
    "Paid Amount": string | number;
    "Balance Due": string | number;
    "Payment Type": string;
    "DC Number": string;
    "Gate Pass No": string;
    "Gate Pass Date": string | number;
    "Subtotal": string | number;
    "CGST": string | number;
    "SGST": string | number;
    "IGST": string | number;
    Remarks: string;
  }

  interface ItemRow {
    "Invoice Number": string;
    "Item Name": string;
    "Part Name": string;
    "HSN/SAC": string;
    Qty: string | number;
    Unit: string;
    Rate: string | number;
    Discount: string | number;
    Amount: string | number;
  }

  const workbook = XLSX.readFile(filePath);
  const invoiceSheet = workbook.Sheets[workbook.SheetNames[0]];
  const invoiceRows = XLSX.utils.sheet_to_json<InvoiceRow>(invoiceSheet, { defval: "" });

  // Try to read items from second sheet if it exists
  const itemRows: ItemRow[] =
    workbook.SheetNames.length > 1
      ? XLSX.utils.sheet_to_json<ItemRow>(workbook.Sheets[workbook.SheetNames[1]], { defval: "" })
      : [];

  // Group items by invoice number
  const itemsByInvoice = new Map<string, ItemRow[]>();
  for (const item of itemRows) {
    const inv = String(item["Invoice Number"]).trim();
    if (!itemsByInvoice.has(inv)) itemsByInvoice.set(inv, []);
    itemsByInvoice.get(inv)!.push(item);
  }

  let created = 0;
  let skipped = 0;

  for (const row of invoiceRows) {
    const invoiceNumber = String(row["Invoice Number"] ?? "").trim();
    if (!invoiceNumber) { skipped++; continue; }

    // Find or skip if already exists
    const existing = await prisma.invoice.findUnique({ where: { invoiceNumber } });
    if (existing) { skipped++; continue; }

    const partyName = String(row["Party Name"] ?? "").trim();
    let partyId: string | undefined;
    if (partyName) {
      const party = await prisma.party.findUnique({ where: { name: partyName } });
      partyId = party?.id;
    }

    const totalAmount = toDecimal(row["Total Amount"]);
    const paidAmount = toDecimal(row["Paid Amount"]);
    const balanceDue = toDecimal(row["Balance Due"]);
    const subtotal = toDecimal(row["Subtotal"]) || totalAmount;
    const cgst = toDecimal(row["CGST"]);
    const sgst = toDecimal(row["SGST"]);
    const igst = toDecimal(row["IGST"]);

    const gatePassDateRaw = row["Gate Pass Date"];
    const gatePassDate =
      gatePassDateRaw && String(gatePassDateRaw).trim()
        ? parseDate(gatePassDateRaw)
        : undefined;

    let status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "CANCELLED" = "DRAFT";
    if (balanceDue <= 0) status = "PAID";
    else if (paidAmount > 0) status = "PARTIALLY_PAID";

    const items = itemsByInvoice.get(invoiceNumber) ?? [];

    await prisma.invoice.create({
      data: {
        invoiceNumber,
        date: parseDate(row["Invoice Date"]),
        partyId,
        totalAmount,
        subtotal,
        cgst,
        sgst,
        igst,
        paidAmount,
        balanceDue,
        status,
        dcNumber: String(row["DC Number"] || "").trim() || undefined,
        gatePassNumber: String(row["Gate Pass No"] || "").trim() || undefined,
        gatePassDate,
        paymentType: String(row["Payment Type"] || "").trim() || undefined,
        remarks: String(row["Remarks"] || "").trim() || undefined,
        items: {
          create: items.map((item) => ({
            itemName: String(item["Item Name"] || "").trim() || undefined,
            partName: String(item["Part Name"] || "").trim() || undefined,
            hsnCode: String(item["HSN/SAC"] || "").trim() || undefined,
            unit: String(item["Unit"] || "").trim() || undefined,
            qty: toDecimal(item["Qty"]),
            rate: toDecimal(item["Rate"]),
            discount: toDecimal(item["Discount"]),
            amount: toDecimal(item["Amount"]),
          })),
        },
      },
    });
    created++;
  }

  console.log(`  Sale invoices: ${created} created, ${skipped} skipped`);
}

// ─── Import: Purchase Invoices ───────────────────────────────────────

async function importPurchaseInvoices(filePath: string) {
  console.log(`\nImporting purchase invoices from: ${filePath}`);

  interface PurchaseRow {
    "Invoice Number": string;
    "Invoice Date": string | number;
    "Party Name": string;
    "Total Amount": string | number;
    "Paid Amount": string | number;
    "Balance Due": string | number;
    "Payment Type": string;
    Description: string;
    "PO Number": string;
    "Work Order": string;
    "Batch Number": string;
  }

  const rows = readSheet<PurchaseRow>(filePath);
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const invoiceNumber = String(row["Invoice Number"] ?? "").trim();
    if (!invoiceNumber) { skipped++; continue; }

    const partyName = String(row["Party Name"] ?? "").trim();
    if (!partyName) { skipped++; continue; }

    let party = await prisma.party.findUnique({ where: { name: partyName } });
    if (!party) {
      party = await prisma.party.create({
        data: { name: partyName, type: "SUPPLIER" },
      });
    }

    const totalAmount = toDecimal(row["Total Amount"]);
    const paidAmount = toDecimal(row["Paid Amount"]);
    const balanceDue = toDecimal(row["Balance Due"]);

    let paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" = "UNPAID";
    if (balanceDue <= 0) paymentStatus = "PAID";
    else if (paidAmount > 0) paymentStatus = "PARTIALLY_PAID";

    await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber,
        date: parseDate(row["Invoice Date"]),
        partyId: party.id,
        totalAmount,
        paidAmount,
        balanceDue,
        paymentStatus,
        paymentType: String(row["Payment Type"] || "").trim() || undefined,
        description: String(row["Description"] || "").trim() || undefined,
        poNumber: String(row["PO Number"] || "").trim() || undefined,
        workOrder: String(row["Work Order"] || "").trim() || undefined,
        batchNumber: String(row["Batch Number"] || "").trim() || undefined,
      },
    });
    created++;
  }

  console.log(`  Purchase invoices: ${created} created, ${skipped} skipped`);
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const partiesFile = getArg("parties");
  const saleFile = getArg("sale-invoices");
  const purchaseFile = getArg("purchase-invoices");

  if (!partiesFile && !saleFile && !purchaseFile) {
    console.error("No input files specified.");
    console.error("Usage:");
    console.error("  npx tsx scripts/import-vyapar.ts \\");
    console.error("    --parties=parties.xlsx \\");
    console.error("    --sale-invoices=sale-invoices.xlsx \\");
    console.error("    --purchase-invoices=purchase-invoices.xlsx");
    process.exit(1);
  }

  if (partiesFile) await importParties(path.resolve(partiesFile));
  if (saleFile) await importSaleInvoices(path.resolve(saleFile));
  if (purchaseFile) await importPurchaseInvoices(path.resolve(purchaseFile));

  console.log("\nImport complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
