/**
 * Vyapar Data Import Script
 *
 * Place Excel files in scripts/data/:
 *   PartyReport.xlsx
 *   SaleReport_01_12_23_to_28_02_26.xlsx  (sheets: "Sale Report", "Item Details")
 *   PurchaseReport_01_10_23_to_16_02_26.xlsx
 *   DeliveryChallanReport_01_04_25_to_28_02_26.xlsx
 *   AllTransactionsReport_01_03_24_to_31_01_26.xlsx
 *
 * Import order (dependencies respected):
 *   Step 1: Parties
 *   Step 2: Sale Invoices
 *   Step 3: Invoice Items
 *   Step 4: Purchase Invoices
 *   Step 5: Delivery Challans
 *   Step 6: Credit Notes
 *
 * Usage:
 *   npm run import                          # run all imports
 *   npm run import -- --all                 # run all imports
 *   npm run import -- --parties             # parties only
 *   npm run import -- --sales               # sale invoices + items
 *   npm run import -- --purchases           # purchase invoices
 *   npm run import -- --dc                  # delivery challans
 *   npm run import -- --creditnotes         # credit notes
 *   npm run import -- --parties --sales     # combine flags
 */

import { config } from "dotenv";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

const DATA_DIR = path.join(__dirname, "data");

// ─── Division cache (loaded once) ────────────────────────────────────

let divisionByCode: Record<string, string> = {};

async function loadDivisions() {
  const divisions = await prisma.division.findMany();
  for (const d of divisions) divisionByCode[d.code] = d.id;
}

function getDivisionId(partyName: string): string | undefined {
  const n = partyName.toLowerCase();
  if (n.includes("aircraft")) return divisionByCode["AD"];
  if (n.includes("lca") || n.includes("tejas")) return divisionByCode["LCA"];
  if (n.includes("aerospace")) return divisionByCode["ASD"];
  if (n.includes("engine division")) return divisionByCode["ED"];
  if (n.includes("overhaul")) return divisionByCode["OHD"];
  return undefined;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function parseDate(value: unknown): Date | null {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number" && value > 0) {
    // Excel serial date — standard formula accounting for Excel's 1900 leap year bug
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    // DD/MM/YYYY or DD-MM-YYYY
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const d = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toNum(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[,₹\s]/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function str(value: unknown): string {
  return String(value ?? "").trim();
}

/** Read a sheet and return raw row arrays, starting from dataStart (0-based). */
function sheetToArrays(
  wb: XLSX.WorkBook,
  sheetId: string | number,
  dataStart: number
): unknown[][] {
  const name =
    typeof sheetId === "number" ? wb.SheetNames[sheetId] : sheetId;
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  const all = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });
  return (all.slice(dataStart) as unknown[][]);
}

/** Read a sheet and return named row objects using a specific header row. */
function sheetToObjects(
  wb: XLSX.WorkBook,
  sheetId: string | number,
  headerRowIndex: number,
  dataStart: number
): Record<string, unknown>[] {
  const name =
    typeof sheetId === "number" ? wb.SheetNames[sheetId] : sheetId;
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  const all = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });
  const headers = ((all[headerRowIndex] as unknown[]) ?? []).map((h) =>
    str(h)
  );
  return all.slice(dataStart).map((rawRow) => {
    const row = rawRow as unknown[];
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      if (h) obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

/** Normalise party name: strip trailing parenthetical "(…)" to deduplicate. */
function normalizeName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function mapPaymentStatus(
  rawStatus: string
): "PAID" | "PARTIALLY_PAID" | "UNPAID" {
  const s = rawStatus.toLowerCase();
  if (s.includes("paid") && !s.includes("un") && !s.includes("partial"))
    return "PAID";
  if (s.includes("partial")) return "PARTIALLY_PAID";
  return "UNPAID";
}

function mapInvoiceStatus(
  rawStatus: string
): "PAID" | "PARTIALLY_PAID" | "UNPAID" {
  const ps = mapPaymentStatus(rawStatus);
  if (ps === "PAID") return "PAID";
  if (ps === "PARTIALLY_PAID") return "PARTIALLY_PAID";
  return "UNPAID";
}

// ─── Party lookup helper ─────────────────────────────────────────────

type PartyRef = { id: string; name: string; gstin?: string | null };

async function loadPartyMap(): Promise<Map<string, PartyRef>> {
  const parties: PartyRef[] = await prisma.party.findMany({
    select: { id: true, name: true, gstin: true },
  });
  return new Map(parties.map((p) => [p.name.toLowerCase(), p]));
}

function findParty(
  partyByName: Map<string, PartyRef>,
  name: string
): PartyRef | undefined {
  if (!name) return undefined;
  return (
    partyByName.get(name.toLowerCase()) ??
    partyByName.get(normalizeName(name).toLowerCase())
  );
}

// ─── Step 1: Import Parties ───────────────────────────────────────────

async function importParties(filePath: string) {
  console.log(`\n[Step 1] Importing parties from: ${path.basename(filePath)}`);

  if (!fs.existsSync(filePath)) {
    console.error(`  ERROR: File not found: ${filePath}`);
    return;
  }

  const wb = XLSX.readFile(filePath);
  // Headers at row 2 (index 1), data from row 3 (index 2)
  const rows = sheetToObjects(wb, 0, 1, 2);

  let upserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawName = str(row["Name"]);
    if (!rawName) { skipped++; continue; }

    const name = normalizeName(rawName);
    if (!name) { skipped++; continue; }

    const receivable = toNum(row["Receivable Balance"]);
    const payable = toNum(row["Payable Balance"]);
    const creditLimit = toNum(row["Credit Limit"]) || undefined;
    const gstin = str(row["GSTIN"]) || undefined;
    const stateCode = gstin ? gstin.substring(0, 2) : undefined;
    const phone = str(row["Phone No."]) || undefined;
    const email = str(row["Email"]) || undefined;
    const address = str(row["Address"]) || undefined;

    // Determine party type
    let type: "CUSTOMER" | "SUPPLIER" | "BOTH" = "BOTH";
    if (receivable > 0 && payable <= 0) type = "CUSTOMER";
    else if (payable > 0 && receivable <= 0) type = "SUPPLIER";

    // HAL detection
    const isHAL = name.toUpperCase().includes("HINDUSTAN AERONAUTICS");
    const divisionId = isHAL ? getDivisionId(name) : undefined;

    try {
      await prisma.party.upsert({
        where: { name },
        update: {
          gstin,
          phone,
          email,
          address,
          stateCode,
          type,
          receivableBalance: receivable,
          payableBalance: payable,
          creditLimit,
          isHAL,
          divisionId: divisionId ?? null,
        },
        create: {
          name,
          gstin,
          phone,
          email,
          address,
          stateCode,
          type,
          receivableBalance: receivable,
          payableBalance: payable,
          creditLimit,
          isHAL,
          divisionId: divisionId ?? null,
        },
      });
      upserted++;
      if (upserted % 50 === 0)
        console.log(`  Imported ${upserted}/${rows.length} parties...`);
    } catch (err) {
      console.error(`  Row ${i + 3}: Failed to upsert party "${name}": ${err}`);
      skipped++;
    }
  }

  console.log(
    `  Done — ${upserted} parties upserted, ${skipped} skipped`
  );
}

// ─── Step 2: Import Sale Invoices ─────────────────────────────────────

async function importSaleInvoices(filePath: string) {
  console.log(
    `\n[Step 2] Importing sale invoices from: ${path.basename(filePath)}`
  );

  if (!fs.existsSync(filePath)) {
    console.error(`  ERROR: File not found: ${filePath}`);
    return;
  }

  const wb = XLSX.readFile(filePath);

  // Locate "Sale Report" sheet
  const saleSheetName = wb.SheetNames.find(
    (n) => n.toLowerCase().includes("sale report")
  );
  if (!saleSheetName) {
    console.error(`  ERROR: "Sale Report" sheet not found`);
    return;
  }

  // Headers at row 3 (index 2), data from row 4 (index 3)
  const rows = sheetToArrays(wb, saleSheetName, 3);

  let created = 0;
  let skipped = 0;

  const partyByName = await loadPartyMap();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const dateRaw = row[0];
    // row[1]: Order No (ignore)
    const invoiceNumber = str(row[2]);
    if (!invoiceNumber) { skipped++; continue; }

    const partyName = normalizeName(str(row[3]));
    // row[4]: GSTIN
    // row[5]: Party Phone (ignore)
    const totalAmount = toNum(row[6]);
    const paymentType = str(row[7]) || undefined;
    const paidAmount = toNum(row[8]);
    const balanceDue = toNum(row[9]);
    const paymentStatusRaw = str(row[10]);
    const remarks0 = str(row[11]) || undefined;
    const gatePassNumber = str(row[12]) || undefined;
    const dcRaw = str(row[13]);
    const gatePassDateRaw = row[14];
    // row[15]: DA No. (ignore)
    const poReference = str(row[16]) || undefined;
    const workOrderRef = str(row[17]) || undefined;
    const batchNumberRef = str(row[18]) || undefined;
    const htMgpRef = str(row[19]) || undefined;
    const hcpMgpRef = str(row[20]) || undefined;

    // Parse DC number — "DC123 & 15/01/2024" → "DC123"
    const dcNumber = dcRaw
      ? dcRaw.split(/\s*&\s*/)[0].trim() || undefined
      : undefined;

    const gatePassDate = parseDate(gatePassDateRaw) ?? undefined;
    const date = parseDate(dateRaw) ?? new Date();

    // Build remarks
    const extraParts: string[] = [];
    if (remarks0) extraParts.push(remarks0);
    const remarks = extraParts.length ? extraParts.join(" | ") : undefined;

    // GST calculation — GSTIN first 2 chars = "29" → Karnataka (same state)
    const partyGstin = str(row[4]);
    const isSameState = partyGstin.startsWith("29");
    const subtotal = totalAmount / 1.18;
    const cgst = isSameState ? subtotal * 0.09 : 0;
    const sgst = isSameState ? subtotal * 0.09 : 0;
    const igst = isSameState ? 0 : subtotal * 0.18;

    const status = mapInvoiceStatus(paymentStatusRaw);

    const party = findParty(partyByName, partyName);

    // Try to link PO
    let purchaseOrderId: string | undefined;
    if (poReference) {
      try {
        const po = await prisma.purchaseOrder.findUnique({
          where: { poNumber: poReference },
          select: { id: true },
        });
        purchaseOrderId = po?.id;
      } catch {
        // ignore
      }
    }

    const invoiceData = {
      date,
      partyId: party?.id ?? null,
      purchaseOrderId: purchaseOrderId ?? null,
      subtotal,
      cgst,
      sgst,
      igst,
      totalAmount,
      paidAmount,
      balanceDue,
      status,
      dcNumber,
      gatePassNumber,
      gatePassDate: gatePassDate ?? null,
      paymentType,
      poReference,
      workOrderRef,
      batchNumberRef,
      htMgpRef,
      hcpMgpRef,
      remarks,
    };

    try {
      await prisma.invoice.upsert({
        where: { invoiceNumber },
        update: invoiceData,
        create: {
          invoiceNumber,
          ...invoiceData,
        },
      });
      created++;
      if (created % 100 === 0)
        console.log(`  Imported ${created}/${rows.length} invoices...`);
    } catch (err) {
      console.error(
        `  Row ${i + 4}: Failed to create invoice "${invoiceNumber}": ${err}`
      );
      skipped++;
    }
  }

  console.log(
    `  Done — ${created} sale invoices upserted, ${skipped} skipped`
  );
}

// ─── Step 3: Import Invoice Items ─────────────────────────────────────

async function importInvoiceItems(filePath: string) {
  console.log(
    `\n[Step 3] Importing invoice items from: ${path.basename(filePath)}`
  );

  if (!fs.existsSync(filePath)) {
    console.error(`  ERROR: File not found: ${filePath}`);
    return;
  }

  const wb = XLSX.readFile(filePath);

  // Locate "Item Details" sheet
  const itemSheetName = wb.SheetNames.find((n) =>
    n.toLowerCase().includes("item")
  );
  if (!itemSheetName) {
    console.error(`  ERROR: "Item Details" sheet not found`);
    return;
  }

  // Headers at row 3 (index 2), data from row 4 (index 3)
  const rows = sheetToArrays(wb, itemSheetName, 3);

  // Pre-load invoice IDs for fast lookup
  const invoices = await prisma.invoice.findMany({
    select: { id: true, invoiceNumber: true },
  });
  const invoiceById = new Map(invoices.map((inv) => [inv.invoiceNumber, inv.id]));

  // Delete existing items before re-importing to allow idempotent re-runs
  // (We'll skip delete and just skip rows for invoices that already have items)
  const invoicesWithItems = new Set(
    (
      await prisma.invoiceItem.findMany({
        select: { invoiceId: true },
        distinct: ["invoiceId"],
      })
    ).map((x) => x.invoiceId)
  );

  let created = 0;
  let skipped = 0;
  const processed = new Set<string>();

  // Group rows by invoice number first
  const itemsByInvoice = new Map<string, unknown[][]>();
  for (const row of rows) {
    const invNo = str(row[1]);
    if (!invNo) continue;
    if (!itemsByInvoice.has(invNo)) itemsByInvoice.set(invNo, []);
    itemsByInvoice.get(invNo)!.push(row);
  }

  for (const [invoiceNumber, itemRows] of itemsByInvoice) {
    const invoiceId = invoiceById.get(invoiceNumber);
    if (!invoiceId) {
      console.warn(
        `  WARN: Invoice "${invoiceNumber}" not found — ${itemRows.length} items skipped`
      );
      skipped += itemRows.length;
      continue;
    }

    // Skip if this invoice already has items (idempotent)
    if (invoicesWithItems.has(invoiceId)) {
      skipped += itemRows.length;
      continue;
    }

    try {
      const data = itemRows
        .map((row) => {
          const qty = toNum(row[9]);
          const rate = toNum(row[11]);
          const amount = toNum(row[15]);
          if (!qty && !amount) return null; // skip empty rows
          return {
            invoiceId,
            itemName: str(row[3]) || null,      // Col D: Item Name (drawing/part no.)
            // row[4]: Item Code (ignore)
            hsnCode: str(row[5]) || null,        // Col F: HSN/SAC
            // row[6]: Category (ignore)
            partName: str(row[7]) || null,       // Col H: Part Name
            // row[8]: Challan/Order No (ignore)
            qty,                                  // Col J: Quantity
            unit: str(row[10]) || null,          // Col K: Unit
            rate,                                 // Col L: UnitPrice
            // row[12]: Discount % (ignore)
            discount: toNum(row[13]),            // Col N: Discount
            // row[14]: Transaction Type (ignore)
            amount,                               // Col P: Amount
          };
        })
        .filter(Boolean) as {
          invoiceId: string;
          itemName: string | null;
          hsnCode: string | null;
          partName: string | null;
          qty: number;
          unit: string | null;
          rate: number;
          discount: number;
          amount: number;
        }[];

      if (data.length > 0) {
        await prisma.invoiceItem.createMany({ data });
        created += data.length;
      }
      processed.add(invoiceNumber);
    } catch (err) {
      console.error(
        `  Failed to create items for invoice "${invoiceNumber}": ${err}`
      );
      skipped += itemRows.length;
    }
  }

  console.log(
    `  Done — ${created} items created across ${processed.size} invoices, ${skipped} skipped`
  );
}

// ─── Step 4: Import Purchase Invoices ────────────────────────────────

async function importPurchaseInvoices(filePath: string) {
  console.log(
    `\n[Step 4] Importing purchase invoices from: ${path.basename(filePath)}`
  );

  if (!fs.existsSync(filePath)) {
    console.error(`  ERROR: File not found: ${filePath}`);
    return;
  }

  const wb = XLSX.readFile(filePath);
  // Headers at row 3 (index 2), data from row 4 (index 3)
  const rows = sheetToArrays(wb, 0, 3);

  // Pre-load parties for fast lookup
  const partyByName = await loadPartyMap();

  // Pre-load existing purchase invoice numbers for idempotency
  const existingPurchaseInvoices = new Set(
    (await prisma.purchaseInvoice.findMany({ select: { invoiceNumber: true } }))
      .map((pi) => pi.invoiceNumber)
  );

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const dateRaw = row[0];
    // row[1]: (Col B — not specified in mapping)
    const invoiceNumber = str(row[2]); // Col C
    if (!invoiceNumber) { skipped++; continue; }

    // Idempotent: skip if already exists
    if (existingPurchaseInvoices.has(invoiceNumber)) { skipped++; continue; }

    const partyName = normalizeName(str(row[3])); // Col D
    if (!partyName) { skipped++; continue; }

    // row[4]: GSTIN (Col E — for verification, not stored separately)
    // row[5]: (Col F — skip)
    const totalAmount = toNum(row[6]); // Col G
    const paymentType = str(row[7]) || undefined; // Col H
    const paidAmount = toNum(row[8]); // Col I
    const balanceDue = toNum(row[9]); // Col J
    const paymentStatusRaw = str(row[10]); // Col K
    const description = str(row[11]) || undefined; // Col L
    const poNumber = str(row[12]) || undefined; // Col M
    const workOrder = str(row[13]) || undefined; // Col N
    const batchNumber = str(row[14]) || undefined; // Col O

    const date = parseDate(dateRaw) ?? new Date();
    const paymentStatus = mapPaymentStatus(paymentStatusRaw);

    let party = findParty(partyByName, partyName);

    // Auto-create supplier if not found
    if (!party) {
      try {
        const created_ = await prisma.party.create({
          data: { name: partyName, type: "SUPPLIER" },
        });
        party = created_;
        partyByName.set(partyName.toLowerCase(), party);
      } catch (err) {
        console.error(
          `  Row ${i + 4}: Failed to create party "${partyName}": ${err}`
        );
        skipped++;
        continue;
      }
    }

    try {
      await prisma.purchaseInvoice.create({
        data: {
          invoiceNumber,
          date,
          partyId: party.id,
          totalAmount,
          paidAmount,
          balanceDue,
          paymentStatus,
          paymentType,
          description,
          poNumber,
          workOrder,
          batchNumber,
        },
      });
      created++;
      existingPurchaseInvoices.add(invoiceNumber);
      if (created % 100 === 0)
        console.log(`  Imported ${created}/${rows.length} purchase invoices...`);
    } catch (err) {
      console.error(
        `  Row ${i + 4}: Failed to create purchase invoice "${invoiceNumber}": ${err}`
      );
      skipped++;
    }
  }

  console.log(
    `  Done — ${created} purchase invoices created, ${skipped} skipped`
  );
}

// ─── Step 5: Import Delivery Challans ────────────────────────────────

async function importDeliveryChallans(filePath: string) {
  console.log(
    `\n[Step 5] Importing delivery challans from: ${path.basename(filePath)}`
  );

  if (!fs.existsSync(filePath)) {
    console.error(`  ERROR: File not found: ${filePath}`);
    return;
  }

  const wb = XLSX.readFile(filePath);

  // ── Main sheet: "Delivery Challan" ──
  const mainSheetName = wb.SheetNames.find(
    (n) => n.toLowerCase().includes("delivery challan")
  ) ?? wb.SheetNames[0];

  // Headers at row 3 (index 2), data from row 4 (index 3)
  const mainRows = sheetToObjects(wb, mainSheetName, 2, 3);

  // ── Item Details sheet ──
  const itemSheetName = wb.SheetNames.find((n) =>
    n.toLowerCase().includes("item")
  );
  let itemRows: Record<string, unknown>[] = [];
  if (itemSheetName) {
    // Headers at row 3 (index 2), data from row 4 (index 3)
    itemRows = sheetToObjects(wb, itemSheetName, 2, 3);
  }

  // Group items by DC reference number (Invoice No./Txn No.)
  const itemsByDC = new Map<string, Record<string, unknown>[]>();
  for (const item of itemRows) {
    const dcNo = str(item["Invoice No./Txn No."]);
    if (!dcNo) continue;
    if (!itemsByDC.has(dcNo)) itemsByDC.set(dcNo, []);
    itemsByDC.get(dcNo)!.push(item);
  }

  const partyByName = await loadPartyMap();

  // Pre-load existing DCs for idempotency
  const existingDCs = new Set(
    (await prisma.deliveryChallan.findMany({ select: { dcNumber: true } }))
      .map((dc) => dc.dcNumber)
  );

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < mainRows.length; i++) {
    const row = mainRows[i];
    const dcNumber = str(row["Reference No"]);
    if (!dcNumber) { skipped++; continue; }

    // Idempotent: skip if already exists
    if (existingDCs.has(dcNumber)) { skipped++; continue; }

    const date = parseDate(row["Date"]) ?? new Date();
    const partyName = normalizeName(str(row["Party Name"]));
    const totalAmount = toNum(row["Total"]);
    const paymentType = str(row["Payment Type"]) || undefined;
    const paidAmount = toNum(row["Paid"]);
    const received = toNum(row["Received"]);
    const balanceDue = toNum(row["Balance"]);
    const status = str(row["Txn Status"]) || undefined;
    const description = str(row["Description"]) || undefined;

    const party = findParty(partyByName, partyName);

    // Build item data
    const dcItems = itemsByDC.get(dcNumber) ?? [];
    const itemData = dcItems
      .map((item) => {
        const qty = toNum(item["Quantity"]);
        const rate = toNum(item["UnitPrice"]);
        const amount = toNum(item["Amount"]);
        if (!qty && !amount) return null;
        return {
          itemName: str(item["Item Name"]) || null,
          itemCode: str(item["Item Code"]) || null,
          hsnCode: str(item["HSN/SAC"]) || null,
          partName: str(item["Part Name"]) || null,
          challanOrderNo: str(item["Challan/Order No."]) || null,
          qty,
          unit: str(item["Unit"]) || null,
          rate,
          discountPercent: toNum(item["Discount Percent"]),
          discount: toNum(item["Discount"]),
          amount,
        };
      })
      .filter(Boolean) as Prisma.DeliveryChallanItemCreateWithoutDeliveryChallanInput[];

    try {
      await prisma.deliveryChallan.create({
        data: {
          dcNumber,
          date,
          partyId: party?.id ?? null,
          totalAmount,
          paymentType,
          paidAmount,
          balanceDue,
          status,
          description,
          items: itemData.length > 0 ? { create: itemData } : undefined,
        },
      });
      created++;
      existingDCs.add(dcNumber);
      if (created % 50 === 0)
        console.log(`  Imported ${created}/${mainRows.length} delivery challans...`);
    } catch (err) {
      console.error(
        `  Row ${i + 4}: Failed to create DC "${dcNumber}": ${err}`
      );
      skipped++;
    }
  }

  console.log(
    `  Done — ${created} delivery challans created, ${skipped} skipped`
  );
}

// ─── Step 6: Import Credit Notes ─────────────────────────────────────

async function importCreditNotes(filePath: string) {
  console.log(
    `\n[Step 6] Importing credit notes from: ${path.basename(filePath)}`
  );

  if (!fs.existsSync(filePath)) {
    console.error(`  ERROR: File not found: ${filePath}`);
    return;
  }

  const wb = XLSX.readFile(filePath);

  // ── Main sheet: "Custom Report" ──
  const mainSheetName = wb.SheetNames.find(
    (n) => n.toLowerCase().includes("custom report")
  ) ?? wb.SheetNames[0];

  // Headers at row 1 (index 0), data from row 2 (index 1)
  const allRows = sheetToObjects(wb, mainSheetName, 0, 1);

  // Filter only Credit Note rows
  const mainRows = allRows.filter(
    (row) => str(row["Type"]).toLowerCase() === "credit note"
  );
  console.log(
    `  Found ${mainRows.length} credit note rows out of ${allRows.length} total`
  );

  // ── Item Details sheet ──
  const itemSheetName = wb.SheetNames.find((n) =>
    n.toLowerCase().includes("item")
  );
  let itemRows: Record<string, unknown>[] = [];
  if (itemSheetName) {
    // Headers at row 1 (index 0), data from row 2 (index 1)
    // Note: AllTransactionsReport item details may have headers at row 1
    itemRows = sheetToObjects(wb, itemSheetName, 0, 1);
  }

  // Group items by credit note reference number
  const itemsByCN = new Map<string, Record<string, unknown>[]>();
  for (const item of itemRows) {
    const cnNo = str(item["Invoice No./Txn No."]);
    if (!cnNo) continue;
    if (!itemsByCN.has(cnNo)) itemsByCN.set(cnNo, []);
    itemsByCN.get(cnNo)!.push(item);
  }

  const partyByName = await loadPartyMap();

  // Pre-load existing credit notes for idempotency
  const existingCNs = new Set(
    (await prisma.creditNote.findMany({ select: { creditNoteNumber: true } }))
      .map((cn) => cn.creditNoteNumber)
  );

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < mainRows.length; i++) {
    const row = mainRows[i];
    const creditNoteNumber = str(row["Reference No"]);
    if (!creditNoteNumber) { skipped++; continue; }

    // Idempotent: skip if already exists
    if (existingCNs.has(creditNoteNumber)) { skipped++; continue; }

    const date = parseDate(row["Date"]) ?? new Date();
    const partyName = normalizeName(str(row["Party Name"]));
    const totalAmount = toNum(row["Total"]);
    const description = str(row["Description"]) || undefined;

    const party = findParty(partyByName, partyName);

    // Build item data
    const cnItems = itemsByCN.get(creditNoteNumber) ?? [];
    const itemData = cnItems
      .map((item) => {
        const qty = toNum(item["Quantity"]);
        const rate = toNum(item["UnitPrice"]);
        const amount = toNum(item["Amount"]);
        if (!qty && !amount) return null;
        return {
          itemName: str(item["Item Name"]) || null,
          partName: str(item["Part Name"]) || null,
          hsnCode: str(item["HSN/SAC"]) || null,
          qty,
          rate,
          amount,
        };
      })
      .filter(Boolean) as Prisma.CreditNoteItemCreateWithoutCreditNoteInput[];

    try {
      await prisma.creditNote.create({
        data: {
          creditNoteNumber,
          date,
          partyId: party?.id ?? null,
          totalAmount,
          reason: description,
          status: "PENDING",
          items: itemData.length > 0 ? { create: itemData } : undefined,
        },
      });
      created++;
      existingCNs.add(creditNoteNumber);
      if (created % 50 === 0)
        console.log(`  Imported ${created}/${mainRows.length} credit notes...`);
    } catch (err) {
      console.error(
        `  Row ${i + 2}: Failed to create credit note "${creditNoteNumber}": ${err}`
      );
      skipped++;
    }
  }

  console.log(
    `  Done — ${created} credit notes created, ${skipped} skipped`
  );
}

// ─── CLI Flag Parsing ─────────────────────────────────────────────────

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArg(name: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : undefined;
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Vyapar Data Import ===");
  console.log(`Data directory: ${DATA_DIR}`);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`  Created data directory: ${DATA_DIR}`);
  }

  // Determine which steps to run
  const flagParties = hasFlag("parties");
  const flagSales = hasFlag("sales");
  const flagPurchases = hasFlag("purchases");
  const flagDC = hasFlag("dc");
  const flagCreditNotes = hasFlag("creditnotes");
  const flagAll = hasFlag("all");

  // If no flags specified, run all
  const noFlags = !flagParties && !flagSales && !flagPurchases && !flagDC && !flagCreditNotes && !flagAll;
  const runAll = flagAll || noFlags;

  // File paths (allow CLI overrides via --parties=file.xlsx etc.)
  const partiesFile =
    getArg("parties") ??
    path.join(DATA_DIR, "PartyReport.xlsx");
  const saleFile =
    getArg("sales") ??
    path.join(DATA_DIR, "SaleReport_01_12_23_to_28_02_26.xlsx");
  const purchaseFile =
    getArg("purchases") ??
    path.join(DATA_DIR, "PurchaseReport_01_10_23_to_16_02_26.xlsx");
  const dcFile =
    getArg("dc") ??
    path.join(DATA_DIR, "DeliveryChallanReport_01_04_25_to_28_02_26.xlsx");
  const creditNotesFile =
    getArg("creditnotes") ??
    path.join(DATA_DIR, "AllTransactionsReport_01_03_24_to_31_01_26.xlsx");

  // Load divisions for HAL party matching
  await loadDivisions();
  console.log(
    `Loaded ${Object.keys(divisionByCode).length} divisions: ${Object.keys(divisionByCode).join(", ")}`
  );

  // Step 1
  if (runAll || flagParties) {
    await importParties(partiesFile);
  }

  // Step 2
  if (runAll || flagSales) {
    await importSaleInvoices(saleFile);
  }

  // Step 3 — items link to invoices created in step 2
  if (runAll || flagSales) {
    await importInvoiceItems(saleFile);
  }

  // Step 4
  if (runAll || flagPurchases) {
    await importPurchaseInvoices(purchaseFile);
  }

  // Step 5
  if (runAll || flagDC) {
    await importDeliveryChallans(dcFile);
  }

  // Step 6
  if (runAll || flagCreditNotes) {
    await importCreditNotes(creditNotesFile);
  }

  console.log("\n=== Import complete ===\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("\nFATAL:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
