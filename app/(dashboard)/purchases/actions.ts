"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// ─── Get Suppliers (for dropdown) ───────────────────────────────────

export async function getSuppliers() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  return await prisma.party.findMany({
    where: { type: { in: ["SUPPLIER", "BOTH"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ─── Get all Purchase Invoices ───────────────────────────────────────

export async function getPurchaseInvoices() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const invoices = await prisma.purchaseInvoice.findMany({
    include: {
      party: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  return invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    date: inv.date,
    supplierName: inv.party.name,
    partyId: inv.partyId,
    totalAmount: Number(inv.totalAmount),
    paidAmount: Number(inv.paidAmount),
    balanceDue: Number(inv.balanceDue),
    paymentStatus: inv.paymentStatus,
    paymentType: inv.paymentType ?? "",
    poNumber: inv.poNumber ?? "",
    workOrder: inv.workOrder ?? "",
    description: inv.description ?? "",
  }));
}

// ─── Get single Purchase Invoice ─────────────────────────────────────

export async function getPurchaseInvoice(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const invoice = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      party: { select: { id: true, name: true, gstin: true, phone: true, address: true } },
    },
  });

  if (!invoice) return null;

  return {
    ...invoice,
    totalAmount: Number(invoice.totalAmount),
    paidAmount: Number(invoice.paidAmount),
    balanceDue: Number(invoice.balanceDue),
  };
}

// ─── Create Purchase Invoice ─────────────────────────────────────────

export async function createPurchaseInvoice(data: {
  partyId: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  paymentType?: string;
  description?: string;
  poNumber?: string;
  workOrder?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  if (!data.partyId) return { success: false as const, error: "Supplier is required" };
  if (!data.invoiceNumber?.trim()) return { success: false as const, error: "Invoice number is required" };
  if (!data.date) return { success: false as const, error: "Date is required" };
  if (!data.totalAmount || data.totalAmount <= 0) {
    return { success: false as const, error: "Amount must be greater than 0" };
  }

  try {
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        partyId: data.partyId,
        invoiceNumber: data.invoiceNumber.trim(),
        date: new Date(data.date),
        totalAmount: new Prisma.Decimal(data.totalAmount.toFixed(2)),
        paidAmount: new Prisma.Decimal("0"),
        balanceDue: new Prisma.Decimal(data.totalAmount.toFixed(2)),
        paymentStatus: "UNPAID",
        paymentType: data.paymentType?.trim() || null,
        description: data.description?.trim() || null,
        poNumber: data.poNumber?.trim() || null,
        workOrder: data.workOrder?.trim() || null,
      },
    });

    revalidatePath("/purchases");
    return { success: true as const, id: invoice.id };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2003"
    ) {
      return { success: false as const, error: "Supplier not found" };
    }
    console.error("createPurchaseInvoice error:", error);
    return { success: false as const, error: "Failed to create purchase invoice" };
  }
}

// ─── Mark Purchase Invoice as Paid ──────────────────────────────────

export async function markPurchaseInvoicePaid(id: string, paidAmount: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  try {
    const invoice = await prisma.purchaseInvoice.findUniqueOrThrow({
      where: { id },
    });

    const total = Number(invoice.totalAmount);
    const newPaid = Math.min(paidAmount, total);
    const newBalance = total - newPaid;
    const newStatus =
      newPaid >= total
        ? ("PAID" as const)
        : newPaid > 0
          ? ("PARTIALLY_PAID" as const)
          : ("UNPAID" as const);

    await prisma.purchaseInvoice.update({
      where: { id },
      data: {
        paidAmount: new Prisma.Decimal(newPaid.toFixed(2)),
        balanceDue: new Prisma.Decimal(newBalance.toFixed(2)),
        paymentStatus: newStatus,
      },
    });

    revalidatePath("/purchases");
    revalidatePath(`/purchases/${id}`);
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Failed to update payment" };
  }
}
