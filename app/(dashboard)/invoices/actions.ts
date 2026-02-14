"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createInvoiceSchema,
  recordPaymentSchema,
  updatePaymentStatusSchema,
  getByIdSchema,
} from "@/lib/validations";

// ─── Get all Invoices ───────────────────────────────────────────────

export async function getInvoices() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const invoices = await prisma.invoice.findMany({
    include: {
      purchaseOrder: {
        include: {
          division: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    poNumber: inv.purchaseOrder.poNumber,
    divisionName: inv.purchaseOrder.division.name,
    subtotal: Number(inv.subtotal),
    cgst: Number(inv.cgst),
    sgst: Number(inv.sgst),
    igst: Number(inv.igst),
    totalAmount: Number(inv.totalAmount),
    status: inv.status,
  }));
}

// ─── Get single Invoice ─────────────────────────────────────────────

export async function getInvoice(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const parsed = getByIdSchema.safeParse({ id });
  if (!parsed.success) {
    return null;
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: parsed.data.id },
    include: {
      purchaseOrder: {
        include: {
          division: true,
        },
      },
      items: {
        include: {
          poLineItem: {
            select: {
              partNumber: true,
              partName: true,
              workOrder: true,
              unit: true,
            },
          },
        },
      },
      payments: {
        orderBy: { date: "desc" },
      },
    },
  });

  return invoice;
}

// ─── Get POs with dispatched items for invoicing ────────────────────

export async function getPOsWithDispatches() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  try {
    // Find all non-cancelled POs that have at least one line item with qtyDispatched > 0
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        status: { not: "CANCELLED" },
        lineItems: {
          some: {
            qtyDispatched: { gt: 0 },
          },
        },
      },
      include: {
        division: { select: { name: true } },
        lineItems: {
          where: { qtyDispatched: { gt: 0 } },
          include: {
            invoiceItems: {
              select: { qty: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = purchaseOrders
      .map((po) => ({
        id: po.id,
        poNumber: po.poNumber,
        divisionName: po.division.name,
        lineItems: po.lineItems
          .map((item) => {
            const totalDispatched = Number(item.qtyDispatched);
            const alreadyInvoiced = item.invoiceItems.reduce(
              (sum, ii) => sum + Number(ii.qty),
              0
            );
            const invoiceableQty = totalDispatched - alreadyInvoiced;
            return {
              id: item.id,
              partNumber: item.partNumber,
              partName: item.partName,
              workOrder: item.workOrder,
              unit: item.unit,
              qtyDispatched: totalDispatched,
              alreadyInvoiced,
              invoiceableQty,
              rate: Number(item.rate),
            };
          })
          .filter((item) => item.invoiceableQty > 0),
      }))
      .filter((po) => po.lineItems.length > 0);

    return result;
  } catch {
    return [];
  }
}

// ─── Get next invoice number ────────────────────────────────────────

function getFinancialYear(date: Date): string {
  const month = date.getMonth(); // 0-indexed: 0=Jan, 3=Apr
  const year = date.getFullYear();
  const fyStart = month >= 3 ? year : year - 1; // FY starts in April
  const fyEnd = (fyStart + 1) % 100;
  return `${fyStart}-${String(fyEnd).padStart(2, "0")}`;
}

export async function getNextInvoiceNumber() {
  const session = await getServerSession(authOptions);
  if (!session) return "";

  const fy = getFinancialYear(new Date());
  const prefix = `SSI/INV/${fy}/`;

  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: "desc" },
  });

  let nextNum = 1;
  if (lastInvoice) {
    const parts = lastInvoice.invoiceNumber.split("/");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

// ─── Create Invoice ─────────────────────────────────────────────────

export async function createInvoice(data: {
  purchaseOrderId: string;
  date: string;
  remarks?: string;
  items: { poLineItemId: string; qty: number; rate: number }[];
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  const parsed = createInvoiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const validated = parsed.data;

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      // Validate each item's qty against invoiceable balance inside transaction
      for (const item of validated.items) {
        const lineItem = await tx.pOLineItem.findUniqueOrThrow({
          where: { id: item.poLineItemId },
          include: {
            invoiceItems: { select: { qty: true } },
          },
        });

        const totalDispatched = Number(lineItem.qtyDispatched);
        const alreadyInvoiced = lineItem.invoiceItems.reduce(
          (sum, ii) => sum + Number(ii.qty),
          0
        );
        const invoiceableQty = totalDispatched - alreadyInvoiced;

        if (item.qty > invoiceableQty) {
          throw new Error(
            `Qty ${item.qty} exceeds invoiceable balance of ${invoiceableQty} for ${lineItem.partNumber}`
          );
        }
      }

      // Generate invoice number: SSI/INV/YYYY-YY/NNN (financial year)
      const invoiceDate = new Date(validated.date);
      const fy = getFinancialYear(invoiceDate);
      const prefix = `SSI/INV/${fy}/`;

      const lastInvoice = await tx.invoice.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: "desc" },
      });

      let nextNum = 1;
      if (lastInvoice) {
        const parts = lastInvoice.invoiceNumber.split("/");
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) nextNum = lastNum + 1;
      }
      const invoiceNumber = `${prefix}${String(nextNum).padStart(3, "0")}`;

      // Calculate subtotal
      const subtotal = validated.items.reduce(
        (sum, item) => sum + item.qty * item.rate,
        0
      );

      // GST: Same state (Karnataka) → CGST 9% + SGST 9%
      const cgst = subtotal * 0.09;
      const sgst = subtotal * 0.09;
      const igst = 0;
      const totalAmount = subtotal + cgst + sgst;

      return tx.invoice.create({
        data: {
          invoiceNumber,
          date: invoiceDate,
          purchaseOrderId: validated.purchaseOrderId,
          subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
          cgst: new Prisma.Decimal(cgst.toFixed(2)),
          sgst: new Prisma.Decimal(sgst.toFixed(2)),
          igst: new Prisma.Decimal(igst.toFixed(2)),
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
          remarks: validated.remarks || null,
          items: {
            create: validated.items.map((item) => ({
              poLineItemId: item.poLineItemId,
              qty: new Prisma.Decimal(item.qty),
              rate: new Prisma.Decimal(item.rate),
              amount: new Prisma.Decimal((item.qty * item.rate).toFixed(2)),
            })),
          },
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        entity: "Invoice",
        entityId: invoice.id,
        action: "CREATE",
        changes: { invoiceNumber: invoice.invoiceNumber },
        userId: session.user.id,
      },
    });

    revalidatePath("/invoices");
    return { success: true as const, id: invoice.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false as const, error: "Invoice number already exists" };
    }
    // Only pass through our own intentional validation errors
    if (error instanceof Error && error.message.startsWith("Qty")) {
      return { success: false as const, error: error.message };
    }
    console.error("createInvoice error:", error);
    return { success: false as const, error: "Failed to create invoice. Please try again." };
  }
}

// ─── Update Payment Status ──────────────────────────────────────────

export async function updatePaymentStatus(
  invoiceId: string,
  status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "CANCELLED"
) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  const parsed = updatePaymentStatusSchema.safeParse({ invoiceId, status });
  if (!parsed.success) {
    return { success: false as const, error: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    await prisma.invoice.update({
      where: { id: parsed.data.invoiceId },
      data: { status: parsed.data.status },
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${parsed.data.invoiceId}`);
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Failed to update payment status" };
  }
}

// ─── Record Payment ─────────────────────────────────────────────────

export async function recordPayment(data: {
  invoiceId: string;
  amount: number;
  date: string;
  mode?: "NEFT" | "RTGS" | "CHEQUE" | "UPI" | "CASH";
  reference?: string;
  remarks?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  const parsed = recordPaymentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const validated = parsed.data;

  try {
    // Validate total payments don't exceed invoice total
    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: validated.invoiceId },
      include: {
        payments: { where: { status: "RECEIVED" } },
      },
    });

    const existingPaid = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    const remaining = Number(invoice.totalAmount) - existingPaid;

    if (validated.amount > remaining) {
      return {
        success: false as const,
        error: `Payment of ${validated.amount} exceeds remaining balance of ${remaining.toFixed(2)}`,
      };
    }

    await prisma.payment.create({
      data: {
        invoiceId: validated.invoiceId,
        amount: new Prisma.Decimal(validated.amount),
        date: new Date(validated.date),
        mode: validated.mode || null,
        reference: validated.reference || null,
        remarks: validated.remarks || null,
        status: "RECEIVED",
      },
    });

    // Recalculate total payments to auto-update status
    const totalPaid = existingPaid + validated.amount;

    const newStatus: "PAID" | "PARTIALLY_PAID" =
      totalPaid >= Number(invoice.totalAmount) ? "PAID" : "PARTIALLY_PAID";

    await prisma.invoice.update({
      where: { id: validated.invoiceId },
      data: { status: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        entity: "Payment",
        entityId: validated.invoiceId,
        action: "CREATE",
        changes: { amount: validated.amount, invoiceNumber: invoice.invoiceNumber },
        userId: session.user.id,
      },
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${validated.invoiceId}`);
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && error.message.includes("exceeds remaining balance")) {
      return { success: false as const, error: error.message };
    }
    console.error("recordPayment error:", error);
    return { success: false as const, error: "Failed to record payment. Please try again." };
  }
}
