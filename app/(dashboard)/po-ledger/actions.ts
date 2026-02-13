"use server";

import { prisma } from "@/lib/db";
import { poLedgerFiltersSchema } from "@/lib/validations";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Types ──────────────────────────────────────────────────────────

export type POLedgerFilters = {
  divisionId?: string;
  status?: "ALL" | "OPEN" | "PARTIALLY_FULFILLED" | "COMPLETED";
  dateFrom?: string;
  dateTo?: string;
};

export type POLedgerRow = {
  id: string;
  poNumber: string;
  poDate: string;
  deliveryDate: string | null;
  divisionName: string;
  partNumber: string;
  partName: string;
  workOrder: string | null;
  qtyOrdered: number;
  qtyReceived: number;
  qtyDispatched: number;
  balance: number;
  rate: number;
  balanceValue: number;
  poStatus: "OPEN" | "PARTIALLY_FULFILLED" | "COMPLETED" | "CANCELLED";
  isOverdue: boolean;
};

export type POLedgerSummary = {
  totalOrdered: number;
  totalReceived: number;
  totalDispatched: number;
  totalBalance: number;
  totalBalanceValue: number;
  rowCount: number;
};

export type POLedgerData = {
  rows: POLedgerRow[];
  summary: POLedgerSummary;
};

type DivisionOption = {
  id: string;
  name: string;
  code: string;
};

// ─── Get Divisions for filter dropdown ──────────────────────────────

export async function getDivisions(): Promise<DivisionOption[]> {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const divisions = await prisma.division.findMany({
    orderBy: { name: "asc" },
  });
  return divisions.map((d) => ({ id: d.id, name: d.name, code: d.code }));
}

// ─── Get PO Ledger Data ─────────────────────────────────────────────

export async function getPOLedgerData(
  filters: POLedgerFilters = {}
): Promise<POLedgerData> {
  const session = await getServerSession(authOptions);
  if (!session) return { rows: [], summary: { totalOrdered: 0, totalReceived: 0, totalDispatched: 0, totalBalance: 0, totalBalanceValue: 0, rowCount: 0 } };

  const parsed = poLedgerFiltersSchema.safeParse(filters);
  const validFilters: POLedgerFilters = parsed.success ? parsed.data : {};

  const where: Record<string, unknown> = {};

  if (validFilters.divisionId) {
    where.divisionId = validFilters.divisionId;
  }

  if (validFilters.status && validFilters.status !== "ALL") {
    where.status = validFilters.status;
  }

  if (validFilters.dateFrom || validFilters.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (validFilters.dateFrom) dateFilter.gte = new Date(validFilters.dateFrom);
    if (validFilters.dateTo) {
      const end = new Date(validFilters.dateTo);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    where.date = dateFilter;
  }

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      division: true,
      lineItems: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { date: "desc" },
  });

  const now = new Date();
  const rows: POLedgerRow[] = [];

  for (const po of purchaseOrders) {
    for (const item of po.lineItems) {
      const qtyOrdered = Number(item.qtyOrdered);
      const qtyReceived = Number(item.qtyReceived);
      const qtyDispatched = Number(item.qtyDispatched);
      const rate = Number(item.rate);
      const balance = qtyOrdered - qtyDispatched;
      const isOverdue =
        po.deliveryDate !== null &&
        new Date(po.deliveryDate) < now &&
        balance > 0;

      rows.push({
        id: item.id,
        poNumber: po.poNumber,
        poDate: po.date.toISOString(),
        deliveryDate: po.deliveryDate?.toISOString() ?? null,
        divisionName: po.division.name,
        partNumber: item.partNumber,
        partName: item.partName,
        workOrder: item.workOrder,
        qtyOrdered,
        qtyReceived,
        qtyDispatched,
        balance,
        rate,
        balanceValue: balance * rate,
        poStatus: po.status,
        isOverdue,
      });
    }
  }

  const summary: POLedgerSummary = {
    totalOrdered: rows.reduce((sum, r) => sum + r.qtyOrdered, 0),
    totalReceived: rows.reduce((sum, r) => sum + r.qtyReceived, 0),
    totalDispatched: rows.reduce((sum, r) => sum + r.qtyDispatched, 0),
    totalBalance: rows.reduce((sum, r) => sum + r.balance, 0),
    totalBalanceValue: rows.reduce((sum, r) => sum + r.balanceValue, 0),
    rowCount: rows.length,
  };

  return { rows, summary };
}
