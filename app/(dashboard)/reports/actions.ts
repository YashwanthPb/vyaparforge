"use server";

import { prisma } from "@/lib/db";
import { Prisma, InvoiceStatus } from "@prisma/client";
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

// ─── Receivables Aging Report ───────────────────────────────────────

export async function getReceivablesAging() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "PAID" } },
    include: {
      party: { select: { id: true, name: true } },
      payments: { where: { status: "RECEIVED" }, select: { amount: true } },
    },
  });

  const now = new Date();

  type AgingBucket = {
    partyId: string;
    partyName: string;
    current: number;   // 0–30
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    total: number;
  };

  const partyMap = new Map<string, AgingBucket>();

  for (const inv of invoices) {
    if (!inv.party) continue;
    const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
    const outstanding = Math.max(0, Number(inv.totalAmount) - paid);
    if (outstanding <= 0) continue;

    const days = Math.max(
      0,
      Math.floor((now.getTime() - inv.date.getTime()) / (1000 * 60 * 60 * 24))
    );

    let bucket = partyMap.get(inv.party.id);
    if (!bucket) {
      bucket = {
        partyId: inv.party.id,
        partyName: inv.party.name,
        current: 0,
        days31_60: 0,
        days61_90: 0,
        days90Plus: 0,
        total: 0,
      };
      partyMap.set(inv.party.id, bucket);
    }

    if (days <= 30) bucket.current += outstanding;
    else if (days <= 60) bucket.days31_60 += outstanding;
    else if (days <= 90) bucket.days61_90 += outstanding;
    else bucket.days90Plus += outstanding;
    bucket.total += outstanding;
  }

  return Array.from(partyMap.values()).sort((a, b) => b.total - a.total);
}

// ─── Payables Aging Report ──────────────────────────────────────────

export async function getPayablesAging() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { paymentStatus: { not: "PAID" } },
    include: {
      party: { select: { id: true, name: true } },
    },
  });

  const now = new Date();

  type AgingBucket = {
    partyId: string;
    partyName: string;
    current: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    total: number;
  };

  const partyMap = new Map<string, AgingBucket>();

  for (const inv of invoices) {
    const outstanding = Number(inv.balanceDue);
    if (outstanding <= 0) continue;

    const days = Math.max(
      0,
      Math.floor((now.getTime() - inv.date.getTime()) / (1000 * 60 * 60 * 24))
    );

    let bucket = partyMap.get(inv.party.id);
    if (!bucket) {
      bucket = {
        partyId: inv.party.id,
        partyName: inv.party.name,
        current: 0,
        days31_60: 0,
        days61_90: 0,
        days90Plus: 0,
        total: 0,
      };
      partyMap.set(inv.party.id, bucket);
    }

    if (days <= 30) bucket.current += outstanding;
    else if (days <= 60) bucket.days31_60 += outstanding;
    else if (days <= 90) bucket.days61_90 += outstanding;
    else bucket.days90Plus += outstanding;
    bucket.total += outstanding;
  }

  return Array.from(partyMap.values()).sort((a, b) => b.total - a.total);
}

// ─── GSTR-1 Export Data ─────────────────────────────────────────────

export async function getGSTR1Data(month: number, year: number) {
  const session = await getServerSession(authOptions);
  if (!session) return { b2b: [], b2cs: [], hsn: [] };

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const invoices = await prisma.invoice.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
    include: {
      party: { select: { name: true, gstin: true, state: true, stateCode: true } },
      items: {
        select: {
          itemName: true,
          partName: true,
          hsnCode: true,
          unit: true,
          qty: true,
          rate: true,
          amount: true,
        },
      },
    },
    orderBy: { date: "asc" },
  });

  // B2B: Invoices to registered parties (have GSTIN)
  const b2b = invoices
    .filter((inv) => inv.party?.gstin)
    .map((inv) => ({
      gstin: inv.party!.gstin!,
      partyName: inv.party!.name,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.date.toISOString(),
      invoiceValue: Number(inv.totalAmount),
      placeOfSupply: inv.party?.stateCode
        ? `${inv.party.stateCode}-${inv.party.state ?? ""}`
        : "",
      reverseCharge: "N",
      invoiceType: "Regular",
      eCommerceGSTIN: "",
      taxableValue: Number(inv.subtotal),
      cgst: Number(inv.cgst),
      sgst: Number(inv.sgst),
      igst: Number(inv.igst),
      cess: 0,
    }));

  // B2CS: Invoices to unregistered parties (no GSTIN)
  const b2cs = invoices
    .filter((inv) => !inv.party?.gstin)
    .map((inv) => ({
      placeOfSupply: inv.party?.stateCode
        ? `${inv.party.stateCode}-${inv.party.state ?? ""}`
        : "",
      type: "OE",
      taxableValue: Number(inv.subtotal),
      cgst: Number(inv.cgst),
      sgst: Number(inv.sgst),
      igst: Number(inv.igst),
      cess: 0,
    }));

  // HSN Summary: Group by HSN code
  const hsnMap = new Map<
    string,
    {
      hsn: string;
      description: string;
      uqc: string;
      totalQty: number;
      totalValue: number;
      taxableValue: number;
      igst: number;
      cgst: number;
      sgst: number;
    }
  >();

  for (const inv of invoices) {
    for (const item of inv.items) {
      const hsn = item.hsnCode ?? "9988";
      const existing = hsnMap.get(hsn);
      const qty = Number(item.qty);
      const amount = Number(item.amount);
      if (existing) {
        existing.totalQty += qty;
        existing.totalValue += amount;
        existing.taxableValue += amount;
      } else {
        hsnMap.set(hsn, {
          hsn,
          description: item.partName ?? item.itemName ?? "",
          uqc: item.unit ?? "NOS",
          totalQty: qty,
          totalValue: amount,
          taxableValue: amount,
          igst: 0,
          cgst: 0,
          sgst: 0,
        });
      }
    }
    // Distribute GST proportionally across HSN codes
    const invItems = inv.items;
    const invSubtotal = Number(inv.subtotal);
    if (invSubtotal > 0) {
      for (const item of invItems) {
        const hsn = item.hsnCode ?? "9988";
        const entry = hsnMap.get(hsn);
        if (entry) {
          const proportion = Number(item.amount) / invSubtotal;
          entry.igst += Number(inv.igst) * proportion;
          entry.cgst += Number(inv.cgst) * proportion;
          entry.sgst += Number(inv.sgst) * proportion;
        }
      }
    }
  }

  const hsn = Array.from(hsnMap.values());

  return { b2b, b2cs, hsn };
}

// ─── Enhanced Party Statement ───────────────────────────────────────

export async function getPartyStatement(partyId: string, dateFrom?: string, dateTo?: string) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      id: true,
      name: true,
      gstin: true,
      phone: true,
      address: true,
      receivableBalance: true,
      payableBalance: true,
    },
  });

  if (!party) return null;

  const dateFilter: Prisma.DateTimeFilter = {};
  if (dateFrom) dateFilter.gte = new Date(dateFrom);
  if (dateTo) dateFilter.lte = new Date(dateTo);
  const hasDateFilter = dateFrom || dateTo;

  const [invoices, payments, purchaseInvoices, creditNotes] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        partyId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      },
      select: {
        id: true,
        invoiceNumber: true,
        date: true,
        totalAmount: true,
        status: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        invoice: { partyId },
        status: "RECEIVED",
        ...(hasDateFilter ? { date: dateFilter } : {}),
      },
      select: {
        id: true,
        date: true,
        amount: true,
        mode: true,
        reference: true,
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.purchaseInvoice.findMany({
      where: {
        partyId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      },
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
    prisma.creditNote.findMany({
      where: {
        partyId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      },
      select: {
        id: true,
        creditNoteNumber: true,
        date: true,
        totalAmount: true,
        status: true,
      },
      orderBy: { date: "asc" },
    }),
  ]);

  type StatementEntry = {
    id: string;
    date: string;
    type: "SALE" | "PAYMENT_RECEIVED" | "PURCHASE" | "CREDIT_NOTE";
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  };

  const entries: StatementEntry[] = [];

  // Sales (debit to customer - they owe us)
  for (const inv of invoices) {
    entries.push({
      id: inv.id,
      date: inv.date.toISOString(),
      type: "SALE",
      reference: inv.invoiceNumber,
      description: `Sale Invoice ${inv.invoiceNumber}`,
      debit: Number(inv.totalAmount),
      credit: 0,
      balance: 0,
    });
  }

  // Payments received (credit - reduces what they owe)
  for (const pay of payments) {
    entries.push({
      id: pay.id,
      date: pay.date.toISOString(),
      type: "PAYMENT_RECEIVED",
      reference: pay.reference ?? (pay.mode ?? "Payment"),
      description: `Payment for ${pay.invoice.invoiceNumber}`,
      debit: 0,
      credit: Number(pay.amount),
      balance: 0,
    });
  }

  // Purchase invoices (credit - we owe them)
  for (const inv of purchaseInvoices) {
    entries.push({
      id: inv.id,
      date: inv.date.toISOString(),
      type: "PURCHASE",
      reference: inv.invoiceNumber,
      description: `Purchase Invoice ${inv.invoiceNumber}`,
      debit: 0,
      credit: Number(inv.totalAmount),
      balance: 0,
    });
  }

  // Credit notes (credit - reduces receivable)
  for (const cn of creditNotes) {
    entries.push({
      id: cn.id,
      date: cn.date.toISOString(),
      type: "CREDIT_NOTE",
      reference: cn.creditNoteNumber,
      description: `Credit Note ${cn.creditNoteNumber}`,
      debit: 0,
      credit: Number(cn.totalAmount),
      balance: 0,
    });
  }

  // Sort by date
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Opening balance from Vyapar import
  const openingBalance = Number(party.receivableBalance) - Number(party.payableBalance);

  // Compute running balance
  let running = openingBalance;
  for (const entry of entries) {
    running += entry.debit - entry.credit;
    entry.balance = running;
  }

  return {
    party: {
      ...party,
      receivableBalance: Number(party.receivableBalance),
      payableBalance: Number(party.payableBalance),
    },
    entries,
    openingBalance,
    closingBalance: running,
  };
}

// ─── Credit Note Actions ────────────────────────────────────────────

export async function getCreditNotes() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const creditNotes = await prisma.creditNote.findMany({
    include: {
      party: { select: { name: true } },
      items: true,
    },
    orderBy: { date: "desc" },
  });

  return creditNotes.map((cn) => ({
    id: cn.id,
    creditNoteNumber: cn.creditNoteNumber,
    date: cn.date.toISOString(),
    partyName: cn.party?.name ?? "—",
    partyId: cn.partyId,
    totalAmount: Number(cn.totalAmount),
    reason: cn.reason,
    status: cn.status,
    itemCount: cn.items.length,
  }));
}

export async function getCreditNoteDetail(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const cn = await prisma.creditNote.findUnique({
    where: { id },
    include: {
      party: { select: { id: true, name: true, gstin: true } },
      items: true,
    },
  });

  if (!cn) return null;

  return {
    ...cn,
    totalAmount: Number(cn.totalAmount),
    items: cn.items.map((item) => ({
      ...item,
      qty: Number(item.qty),
      rate: Number(item.rate),
      amount: Number(item.amount),
    })),
  };
}

export async function getNextCreditNoteNumber() {
  const session = await getServerSession(authOptions);
  if (!session) return "CN-001";

  const last = await prisma.creditNote.findFirst({
    orderBy: { creditNoteNumber: "desc" },
    select: { creditNoteNumber: true },
  });

  if (!last) return "CN-001";

  const match = last.creditNoteNumber.match(/CN-(\d+)/);
  if (!match) return "CN-001";

  const next = parseInt(match[1]) + 1;
  return `CN-${String(next).padStart(3, "0")}`;
}

export async function createCreditNote(data: {
  partyId: string;
  date: string;
  reason?: string;
  items: { itemName: string; hsnCode?: string; qty: number; rate: number }[];
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  if (!data.partyId || !data.items.length) {
    return { success: false as const, error: "Party and items are required" };
  }

  const creditNoteNumber = await getNextCreditNoteNumber();

  const items = data.items.map((item) => ({
    itemName: item.itemName,
    hsnCode: item.hsnCode ?? null,
    qty: item.qty,
    rate: item.rate,
    amount: item.qty * item.rate,
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  try {
    const cn = await prisma.creditNote.create({
      data: {
        creditNoteNumber,
        date: new Date(data.date),
        partyId: data.partyId,
        totalAmount,
        reason: data.reason ?? null,
        status: "PENDING",
        items: {
          create: items,
        },
      },
    });

    return { success: true as const, id: cn.id };
  } catch {
    return { success: false as const, error: "Failed to create credit note" };
  }
}

export async function adjustCreditNoteAgainstInvoice(
  creditNoteId: string,
  invoiceId: string
) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  try {
    const [cn, invoice] = await Promise.all([
      prisma.creditNote.findUnique({ where: { id: creditNoteId } }),
      prisma.invoice.findUnique({ where: { id: invoiceId } }),
    ]);

    if (!cn || !invoice) {
      return { success: false as const, error: "Credit note or invoice not found" };
    }

    if (cn.status === "ADJUSTED") {
      return { success: false as const, error: "Credit note already adjusted" };
    }

    const cnAmount = Number(cn.totalAmount);
    const currentBalance = Number(invoice.balanceDue);
    const adjustedBalance = Math.max(0, currentBalance - cnAmount);
    const newPaid = Number(invoice.paidAmount) + Math.min(cnAmount, currentBalance);

    const newStatus =
      adjustedBalance <= 0
        ? "PAID"
        : newPaid > 0
          ? "PARTIALLY_PAID"
          : "UNPAID";

    await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          balanceDue: adjustedBalance,
          paidAmount: newPaid,
          status: newStatus as InvoiceStatus,
        },
      }),
      prisma.creditNote.update({
        where: { id: creditNoteId },
        data: { status: "ADJUSTED" },
      }),
    ]);

    return { success: true as const };
  } catch {
    return { success: false as const, error: "Failed to adjust credit note" };
  }
}

