"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Shared ─────────────────────────────────────────────────────────

export async function getDivisions() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

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
  const session = await getServerSession(authOptions);
  if (!session) return [];

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
  const session = await getServerSession(authOptions);
  if (!session) return [];

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
  const session = await getServerSession(authOptions);
  if (!session) return [];

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
  const session = await getServerSession(authOptions);
  if (!session) return [];

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
      poNumber: inv.purchaseOrder?.poNumber ?? "",
      division: inv.purchaseOrder?.division.name ?? "",
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
  const session = await getServerSession(authOptions);
  if (!session) return [];

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
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { not: "PAID" },
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
        poNumber: inv.purchaseOrder?.poNumber ?? "",
        division: inv.purchaseOrder?.division.name ?? "",
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

// ─── Party Ledger ────────────────────────────────────────────────────

export async function getPartyLedger(partyId?: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { parties: [], transactions: [] };

  const parties = await prisma.party.findMany({
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });

  if (!partyId) {
    return { parties, transactions: [] };
  }

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { id: true, name: true },
  });

  if (!party) return { parties, transactions: [] };

  const [invoices, purchaseInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: { partyId },
      select: {
        id: true,
        invoiceNumber: true,
        date: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
        payments: { where: { status: "RECEIVED" }, select: { amount: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.purchaseInvoice.findMany({
      where: { partyId },
      select: {
        id: true,
        invoiceNumber: true,
        date: true,
        totalAmount: true,
        paidAmount: true,
        paymentStatus: true,
      },
      orderBy: { date: "asc" },
    }),
  ]);

  type Transaction = {
    id: string;
    date: string;
    reference: string;
    type: "SALE" | "PURCHASE";
    debit: number;
    credit: number;
    balance: number;
  };

  const transactions: Transaction[] = [];

  // Sales increase receivable (debit customer)
  for (const inv of invoices) {
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    transactions.push({
      id: inv.id,
      date: inv.date.toISOString(),
      reference: inv.invoiceNumber,
      type: "SALE",
      debit: Number(inv.totalAmount),
      credit: paid,
      balance: 0,
    });
  }

  // Purchases increase payable (credit supplier)
  for (const inv of purchaseInvoices) {
    transactions.push({
      id: inv.id,
      date: inv.date.toISOString(),
      reference: inv.invoiceNumber,
      type: "PURCHASE",
      debit: Number(inv.paidAmount),
      credit: Number(inv.totalAmount),
      balance: 0,
    });
  }

  // Sort by date
  transactions.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Compute running balance (debit - credit, positive = we owe / they owe us)
  let running = 0;
  for (const t of transactions) {
    running += t.debit - t.credit;
    t.balance = running;
  }

  return { parties, transactions, partyName: party.name };
}

// ─── Outstanding Receivables ─────────────────────────────────────────

export async function getOutstandingReceivables() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "PAID" } },
    include: {
      party: { select: { name: true } },
      purchaseOrder: {
        select: {
          poNumber: true,
          division: { select: { name: true } },
        },
      },
      payments: { where: { status: "RECEIVED" }, select: { amount: true } },
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
      const outstandingAmount = Number(inv.totalAmount) - totalPaid;
      if (outstandingAmount <= 0) return null;

      const daysOverdue = Math.max(
        0,
        Math.floor(
          (now.getTime() - inv.date.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date.toISOString(),
        partyName: inv.party?.name ?? "—",
        poNumber: inv.purchaseOrder?.poNumber ?? "—",
        division: inv.purchaseOrder?.division.name ?? "—",
        totalAmount: Number(inv.totalAmount),
        paidAmount: totalPaid,
        outstandingAmount,
        daysOverdue,
      };
    })
    .filter(Boolean) as {
      id: string;
      invoiceNumber: string;
      date: string;
      partyName: string;
      poNumber: string;
      division: string;
      totalAmount: number;
      paidAmount: number;
      outstandingAmount: number;
      daysOverdue: number;
    }[];
}

// ─── Outstanding Payables ────────────────────────────────────────────

export async function getOutstandingPayables() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { paymentStatus: { not: "PAID" } },
    include: {
      party: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  const now = new Date();

  return invoices
    .map((inv) => {
      if (Number(inv.balanceDue) <= 0) return null;

      const daysOverdue = Math.max(
        0,
        Math.floor(
          (now.getTime() - inv.date.getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date.toISOString(),
        supplierName: inv.party.name,
        poNumber: inv.poNumber ?? "—",
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        balanceDue: Number(inv.balanceDue),
        paymentStatus: inv.paymentStatus,
        daysOverdue,
      };
    })
    .filter(Boolean) as {
      id: string;
      invoiceNumber: string;
      date: string;
      supplierName: string;
      poNumber: string;
      totalAmount: number;
      paidAmount: number;
      balanceDue: number;
      paymentStatus: string;
      daysOverdue: number;
    }[];
}
