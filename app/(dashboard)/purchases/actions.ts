"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────

export interface PurchaseFilters {
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  status?: string;
  partyId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PurchaseRow {
  id: string;
  invoiceNumber: string;
  date: Date;
  supplierName: string;
  partyId: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  poNumber: string;
}

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

// ─── Get Suppliers for filter (only those with purchase invoices) ────

export async function getSuppliersForFilter() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  return await prisma.party.findMany({
    where: {
      purchaseInvoices: { some: {} },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ─── Get all Purchase Invoices (with filters) ────────────────────────

export async function getPurchaseInvoices(filters: PurchaseFilters = {}) {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const where: Prisma.PurchaseInvoiceWhereInput = {};

  // Status filter
  if (filters.status && filters.status !== "ALL") {
    where.paymentStatus = filters.status as Prisma.EnumPurchaseInvoiceStatusFilter["equals"];
  }

  // Party filter
  if (filters.partyId) {
    where.partyId = filters.partyId;
  }

  // Date range
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      where.date.lte = to;
    }
  }

  // Search
  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      where.OR = [
        { invoiceNumber: { contains: term, mode: "insensitive" } },
        { party: { name: { contains: term, mode: "insensitive" } } },
        { poNumber: { contains: term, mode: "insensitive" } },
      ];
    }
  }

  // Sorting
  let orderBy: Prisma.PurchaseInvoiceOrderByWithRelationInput = { date: "desc" };
  if (filters.sort) {
    const direction = filters.order === "asc" ? "asc" : "desc";
    switch (filters.sort) {
      case "invoiceNumber":
        orderBy = { invoiceNumber: direction };
        break;
      case "date":
        orderBy = { date: direction };
        break;
      case "party":
        orderBy = { party: { name: direction } };
        break;
      case "totalAmount":
        orderBy = { totalAmount: direction };
        break;
      case "balanceDue":
        orderBy = { balanceDue: direction };
        break;
      case "status":
        orderBy = { paymentStatus: direction };
        break;
      default:
        orderBy = { date: "desc" };
    }
  }

  const invoices = await prisma.purchaseInvoice.findMany({
    where,
    include: {
      party: { select: { id: true, name: true } },
    },
    orderBy,
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
    poNumber: inv.poNumber ?? "",
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

// ─── Bulk Mark as Paid ──────────────────────────────────────────────

export async function bulkMarkPurchasesPaid(ids: string[]) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  if (!ids.length || ids.length > 100) {
    return { success: false as const, error: "Invalid selection" };
  }

  try {
    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        id: { in: ids },
        paymentStatus: { not: "PAID" },
      },
    });

    if (invoices.length === 0) {
      return { success: false as const, error: "No eligible invoices found" };
    }

    await prisma.$transaction(async (tx) => {
      for (const inv of invoices) {
        const totalAmount = Number(inv.totalAmount);
        await tx.purchaseInvoice.update({
          where: { id: inv.id },
          data: {
            paidAmount: new Prisma.Decimal(totalAmount.toFixed(2)),
            balanceDue: new Prisma.Decimal("0"),
            paymentStatus: "PAID",
          },
        });
      }
    });

    await prisma.auditLog.create({
      data: {
        entity: "PurchaseInvoice",
        entityId: ids.join(","),
        action: "UPDATE",
        changes: {
          action: `Bulk marked ${invoices.length} purchase invoices as paid`,
          ids,
        },
        userId: session.user.id,
      },
    });

    revalidatePath("/purchases");
    return { success: true as const, count: invoices.length };
  } catch (error) {
    console.error("bulkMarkPurchasesPaid error:", error);
    return { success: false as const, error: "Failed to mark as paid" };
  }
}
