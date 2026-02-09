"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ─── Shared ─────────────────────────────────────────────────────────

export async function getDivisions() {
  return await prisma.division.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
}

// ─── PO Balance Report ──────────────────────────────────────────────

interface POBalanceFilters {
  divisionId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getPOBalanceReport(filters: POBalanceFilters) {
  const where: Prisma.PurchaseOrderWhereInput = {};

  if (filters.divisionId) {
    where.divisionId = filters.divisionId;
  }
  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as Prisma.EnumPOStatusFilter["equals"];
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) {
      where.date.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.date.lte = new Date(filters.dateTo);
    }
  }

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      division: { select: { name: true } },
      lineItems: true,
    },
    orderBy: { date: "desc" },
  });

  const rows = purchaseOrders.flatMap((po) =>
    po.lineItems.map((item) => {
      const qtyOrdered = Number(item.qtyOrdered);
      const qtyReceived = Number(item.qtyReceived);
      const qtyDispatched = Number(item.qtyDispatched);
      const balance = qtyOrdered - qtyDispatched;
      const rate = Number(item.rate);

      return {
        id: item.id,
        poNumber: po.poNumber,
        poDate: po.date.toISOString(),
        deliveryDate: po.deliveryDate?.toISOString() ?? null,
        division: po.division.name,
        partNumber: item.partNumber,
        partName: item.partName,
        workOrder: item.workOrder ?? "",
        qtyOrdered,
        qtyReceived,
        qtyDispatched,
        balance,
        rate,
        balanceValue: balance * rate,
        status: po.status,
      };
    })
  );

  return rows;
}

// ─── Inward Gate Pass Register ──────────────────────────────────────

interface GPRegisterFilters {
  divisionId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getInwardRegister(filters: GPRegisterFilters) {
  const where: Prisma.InwardGatePassWhereInput = {};

  if (filters.divisionId) {
    where.purchaseOrder = { divisionId: filters.divisionId };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  return await prisma.inwardGatePass.findMany({
    where,
    include: {
      purchaseOrder: {
        select: {
          poNumber: true,
          division: { select: { name: true } },
        },
      },
      poLineItem: {
        select: { partNumber: true, partName: true },
      },
    },
    orderBy: { date: "desc" },
  });
}

// ─── Outward Gate Pass Register ─────────────────────────────────────

export async function getOutwardRegister(filters: GPRegisterFilters) {
  const where: Prisma.OutwardGatePassWhereInput = {};

  if (filters.divisionId) {
    where.purchaseOrder = { divisionId: filters.divisionId };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  return await prisma.outwardGatePass.findMany({
    where,
    include: {
      purchaseOrder: {
        select: {
          poNumber: true,
          division: { select: { name: true } },
        },
      },
      poLineItem: {
        select: { partNumber: true, partName: true },
      },
    },
    orderBy: { date: "desc" },
  });
}

// ─── Invoice Register ───────────────────────────────────────────────

interface InvoiceRegisterFilters {
  divisionId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getInvoiceRegister(filters: InvoiceRegisterFilters) {
  const where: Prisma.InvoiceWhereInput = {};

  if (filters.divisionId) {
    where.purchaseOrder = { divisionId: filters.divisionId };
  }
  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as Prisma.EnumInvoiceStatusFilter["equals"];
  }
  if (filters.dateFrom || filters.dateTo) {
    where.date = {};
    if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      purchaseOrder: {
        select: {
          poNumber: true,
          division: { select: { name: true } },
        },
      },
      payments: {
        where: { status: "RECEIVED" },
        select: { amount: true },
      },
    },
    orderBy: { date: "desc" },
  });

  return invoices.map((inv) => {
    const totalPaid = inv.payments.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );
    const totalAmount = Number(inv.totalAmount);

    let paymentStatus: "Paid" | "Partial" | "Unpaid" = "Unpaid";
    if (totalPaid >= totalAmount) paymentStatus = "Paid";
    else if (totalPaid > 0) paymentStatus = "Partial";

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.date.toISOString(),
      poNumber: inv.purchaseOrder.poNumber,
      division: inv.purchaseOrder.division.name,
      subtotal: Number(inv.subtotal),
      cgst: Number(inv.cgst),
      sgst: Number(inv.sgst),
      igst: Number(inv.igst),
      totalAmount,
      totalPaid,
      outstanding: totalAmount - totalPaid,
      status: inv.status,
      paymentStatus,
    };
  });
}

// ─── Division-wise Summary ──────────────────────────────────────────

export async function getDivisionSummary() {
  const divisions = await prisma.division.findMany({
    include: {
      purchaseOrders: {
        include: {
          lineItems: true,
          invoices: {
            include: {
              payments: {
                where: { status: "RECEIVED" },
                select: { amount: true },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return divisions.map((div) => {
    const totalPOs = div.purchaseOrders.length;
    const openPOs = div.purchaseOrders.filter(
      (po) => po.status === "OPEN" || po.status === "PARTIALLY_FULFILLED"
    ).length;

    let totalOrderedValue = 0;
    let totalDispatchedValue = 0;

    for (const po of div.purchaseOrders) {
      for (const item of po.lineItems) {
        totalOrderedValue += Number(item.qtyOrdered) * Number(item.rate);
        totalDispatchedValue += Number(item.qtyDispatched) * Number(item.rate);
      }
    }

    let totalInvoiced = 0;
    let totalReceived = 0;

    for (const po of div.purchaseOrders) {
      for (const inv of po.invoices) {
        totalInvoiced += Number(inv.totalAmount);
        for (const payment of inv.payments) {
          totalReceived += Number(payment.amount);
        }
      }
    }

    return {
      id: div.id,
      division: div.name,
      code: div.code,
      totalPOs,
      openPOs,
      totalOrderedValue,
      totalDispatchedValue,
      totalInvoiced,
      totalReceived,
      outstanding: totalInvoiced - totalReceived,
    };
  });
}

// ─── Outstanding Payments ───────────────────────────────────────────

export async function getOutstandingPayments() {
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { notIn: ["PAID", "CANCELLED"] },
    },
    include: {
      purchaseOrder: {
        select: {
          poNumber: true,
          division: { select: { name: true } },
        },
      },
      payments: {
        where: { status: "RECEIVED" },
        select: { amount: true },
      },
    },
    orderBy: { date: "asc" },
  });

  const now = new Date();

  return invoices
    .map((inv) => {
      const totalPaid = inv.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const totalAmount = Number(inv.totalAmount);
      const outstandingAmount = totalAmount - totalPaid;

      if (outstandingAmount <= 0) return null;

      const daysOverdue = Math.floor(
        (now.getTime() - inv.date.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date.toISOString(),
        poNumber: inv.purchaseOrder.poNumber,
        division: inv.purchaseOrder.division.name,
        totalAmount,
        paidAmount: totalPaid,
        outstandingAmount,
        daysOverdue: Math.max(0, daysOverdue),
      };
    })
    .filter(Boolean) as {
    id: string;
    invoiceNumber: string;
    date: string;
    poNumber: string;
    division: string;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    daysOverdue: number;
  }[];
}
