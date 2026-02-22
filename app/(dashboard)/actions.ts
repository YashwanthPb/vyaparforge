"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Dashboard Stats ────────────────────────────────────────────────

export async function getDashboardStats() {
  const session = await getServerSession(authOptions);
  if (!session)
    return {
      totalInvoices: 0,
      paidInvoices: 0,
      unpaidInvoices: 0,
      purchaseInvoices: 0,
    };

  const [totalInvoices, paidInvoices, unpaidInvoices, purchaseInvoices] =
    await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "PAID" } }),
      prisma.invoice.count({ where: { status: "UNPAID" } }),
      prisma.purchaseInvoice.count(),
    ]);

  return {
    totalInvoices,
    paidInvoices,
    unpaidInvoices,
    purchaseInvoices,
  };
}

// ─── Active POs (10 most recent open/partially fulfilled) ───────────

export async function getActivePOs() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const pos = await prisma.purchaseOrder.findMany({
    where: { status: { in: ["OPEN", "PARTIALLY_FULFILLED"] } },
    include: {
      division: { select: { name: true } },
      lineItems: {
        select: {
          qtyOrdered: true,
          qtyDispatched: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return pos.map((po) => {
    const totalOrdered = po.lineItems.reduce(
      (sum, li) => sum + Number(li.qtyOrdered),
      0
    );
    const totalDispatched = po.lineItems.reduce(
      (sum, li) => sum + Number(li.qtyDispatched),
      0
    );
    const fulfillmentPct =
      totalOrdered > 0
        ? Math.round((totalDispatched / totalOrdered) * 100)
        : 0;

    return {
      id: po.id,
      poNumber: po.poNumber,
      divisionName: po.division.name,
      lineItemCount: po.lineItems.length,
      fulfillmentPct,
      deliveryDate: po.deliveryDate,
      status: po.status,
    };
  });
}

// ─── Outstanding Stats ──────────────────────────────────────────────

export async function getOutstandingStats() {
  const session = await getServerSession(authOptions);
  if (!session) return { receivables: 0, payables: 0 };

  const [receivablesAgg, payablesAgg] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { balanceDue: true },
      where: { status: { not: "PAID" } },
    }),
    prisma.purchaseInvoice.aggregate({
      _sum: { balanceDue: true },
      where: { paymentStatus: { not: "PAID" } },
    }),
  ]);

  const receivables = Number(receivablesAgg._sum.balanceDue ?? 0);
  const payables = Number(payablesAgg._sum.balanceDue ?? 0);

  return { receivables, payables };
}

// ─── Division Summary ───────────────────────────────────────────────

export async function getDivisionSummary() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const divisions = await prisma.division.findMany({
    include: {
      purchaseOrders: {
        where: { status: { in: ["OPEN", "PARTIALLY_FULFILLED"] } },
        include: {
          lineItems: {
            select: {
              qtyOrdered: true,
              qtyDispatched: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return divisions.map((div) => {
    const openPOCount = div.purchaseOrders.length;
    const pendingBalance = div.purchaseOrders.reduce((sum, po) => {
      return (
        sum +
        po.lineItems.reduce(
          (s, li) => s + (Number(li.qtyOrdered) - Number(li.qtyDispatched)),
          0
        )
      );
    }, 0);

    return {
      id: div.id,
      name: div.name,
      code: div.code,
      openPOCount,
      pendingBalance,
    };
  });
}

// ─── Top 5 Outstanding Parties ──────────────────────────────────────

export async function getTopOutstandingParties() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "PAID" } },
    select: {
      partyId: true,
      party: { select: { name: true } },
      balanceDue: true,
    },
  });

  const partyMap = new Map<string, { name: string; outstanding: number }>();

  for (const inv of invoices) {
    if (!inv.partyId || !inv.party) continue;
    const balance = Math.max(0, Number(inv.balanceDue));
    const existing = partyMap.get(inv.partyId);
    if (existing) {
      existing.outstanding += balance;
    } else {
      partyMap.set(inv.partyId, { name: inv.party.name, outstanding: balance });
    }
  }

  return Array.from(partyMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);
}

// ─── Monthly Revenue (Last 12 months) ───────────────────────────────

export async function getMonthlyRevenue() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const invoices = await prisma.invoice.findMany({
    where: {
      date: { gte: twelveMonthsAgo },
    },
    select: {
      date: true,
      totalAmount: true,
    },
    orderBy: { date: "asc" },
  });

  const monthMap = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, 0);
  }

  for (const inv of invoices) {
    const d = new Date(inv.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) ?? 0) + Number(inv.totalAmount));
    }
  }

  return Array.from(monthMap.entries()).map(([month, revenue]) => {
    const [y, m] = month.split("-");
    const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
    return { month: label, revenue };
  });
}

// ─── Invoice vs Payment Comparison ──────────────────────────────────

export async function getInvoiceVsPayment() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const invoices = await prisma.invoice.findMany({
    where: { date: { gte: sixMonthsAgo } },
    select: { date: true, totalAmount: true, paidAmount: true },
  });

  const monthMap = new Map<string, { invoiced: number; collected: number }>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, { invoiced: 0, collected: 0 });
  }

  for (const inv of invoices) {
    const d = new Date(inv.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key);
    if (entry) {
      entry.invoiced += Number(inv.totalAmount);
      entry.collected += Number(inv.paidAmount);
    }
  }

  return Array.from(monthMap.entries()).map(([month, data]) => {
    const [y, m] = month.split("-");
    const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
    return { month: label, ...data };
  });
}

// ─── Overdue Invoice Count ──────────────────────────────────────────

export async function getOverdueInvoiceCount() {
  const session = await getServerSession(authOptions);
  if (!session) return 0;

  const unpaidInvoices = await prisma.invoice.findMany({
    where: { status: { not: "PAID" } },
    select: { date: true },
  });

  const now = new Date();
  return unpaidInvoices.filter((inv) => {
    const invoiceDate = new Date(inv.date);
    const diff = now.getTime() - invoiceDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days > 30;
  }).length;
}
