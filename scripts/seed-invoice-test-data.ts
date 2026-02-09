/**
 * Seeds test data for the invoice creation flow:
 * 1. A PurchaseOrder with 3 line items
 * 2. Inward Gate Passes (raw material received from HAL)
 * 3. Outward Gate Passes (fabricated parts dispatched to HAL)
 *
 * After running this, the invoice creation page should show
 * the PO in the dropdown with invoiceable line items.
 *
 * Usage: npx tsx scripts/seed-invoice-test-data.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Get Aircraft Division
  const division = await prisma.division.findFirst({
    where: { code: "AC" },
  });
  if (!division) {
    console.error("No Aircraft Division found. Run prisma db seed first.");
    return;
  }

  console.log("Creating test PO for invoice flow...");

  // Create a Purchase Order with line items
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: "HAL/AD/2025/TEST-001",
      date: new Date("2025-01-15"),
      deliveryDate: new Date("2025-06-30"),
      divisionId: division.id,
      status: "PARTIALLY_FULFILLED",
      remarks: "Test PO for invoice flow",
      lineItems: {
        create: [
          {
            partNumber: "SSI-AD-101",
            partName: "Fuselage Bracket Assembly",
            workOrder: "WO/AD/2025/001",
            qtyOrdered: new Prisma.Decimal(50),
            qtyReceived: new Prisma.Decimal(50),
            qtyDispatched: new Prisma.Decimal(30),
            rate: new Prisma.Decimal(2500),
            unit: "NOS",
          },
          {
            partNumber: "SSI-AD-102",
            partName: "Wing Rib Connector",
            workOrder: "WO/AD/2025/002",
            qtyOrdered: new Prisma.Decimal(100),
            qtyReceived: new Prisma.Decimal(80),
            qtyDispatched: new Prisma.Decimal(60),
            rate: new Prisma.Decimal(1800),
            unit: "NOS",
          },
          {
            partNumber: "SSI-AD-103",
            partName: "Landing Gear Support Plate",
            workOrder: "WO/AD/2025/003",
            qtyOrdered: new Prisma.Decimal(20),
            qtyReceived: new Prisma.Decimal(20),
            qtyDispatched: new Prisma.Decimal(15),
            rate: new Prisma.Decimal(7500),
            unit: "NOS",
          },
        ],
      },
    },
    include: { lineItems: true },
  });

  console.log(`  PO: ${po.poNumber} (${po.lineItems.length} line items)`);

  // Create Inward Gate Passes (raw material received)
  for (const item of po.lineItems) {
    await prisma.inwardGatePass.create({
      data: {
        gpNumber: `IGP/AD/${item.partNumber}`,
        date: new Date("2025-02-01"),
        purchaseOrderId: po.id,
        poLineItemId: item.id,
        qty: item.qtyReceived,
        batchNumber: `BATCH-${item.partNumber}`,
        remarks: "Raw material received from HAL",
      },
    });
  }
  console.log("  Inward gate passes created");

  // Create Outward Gate Passes (dispatched fabricated parts)
  for (const item of po.lineItems) {
    await prisma.outwardGatePass.create({
      data: {
        gpNumber: `OGP/AD/${item.partNumber}`,
        date: new Date("2025-03-15"),
        purchaseOrderId: po.id,
        poLineItemId: item.id,
        qty: item.qtyDispatched,
        batchNumber: `DISPATCH-${item.partNumber}`,
        vehicleNumber: "KA-01-AB-1234",
        challanNumber: `DC/${item.partNumber}`,
        dispatchDate: new Date("2025-03-15"),
        remarks: "Fabricated parts dispatched to HAL",
      },
    });
  }
  console.log("  Outward gate passes created");

  // Summary
  console.log("\n=== TEST DATA SUMMARY ===");
  console.log(`PO: ${po.poNumber}`);
  for (const item of po.lineItems) {
    console.log(
      `  ${item.partNumber} (${item.partName}): ` +
        `ordered=${item.qtyOrdered}, received=${item.qtyReceived}, ` +
        `dispatched=${item.qtyDispatched}, rate=${item.rate}`
    );
    console.log(
      `    Invoiceable: ${item.qtyDispatched} dispatched - 0 invoiced = ${item.qtyDispatched}`
    );
  }
  console.log("\nYou can now go to /invoices/new and see this PO in the dropdown.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
