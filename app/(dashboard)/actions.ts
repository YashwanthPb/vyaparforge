"use server";

import { prisma } from "@/lib/db";

// ─── Dashboard Stats ────────────────────────────────────────────────

export async function getDashboardStats() {
  const [openPOs, lineItems, overdue] = await Promise.all([
    // Count of POs with status OPEN or PARTIALLY_FULFILLED
    prisma.purchaseOrder.count({
      where: { status: { in: ["OPEN", "PARTIALLY_FULFILLED"] } },
    }),

    // Fetch all line items to compare qtyReceived vs qtyOrdered/qtyDispatched
    prisma.pOLineItem.findMany({
      select: { qtyOrdered: true, qtyReceived: true, qtyDispatched: true },
    }),

    // POs where deliveryDate < today AND status not COMPLETED
    prisma.purchaseOrder.count({
      where: {
        deliveryDate: { lt: new Date() },
        status: { not: "COMPLETED" },
      },
    }),
  ]);

  const pendingMaterial = lineItems.filter(
    (i) => Number(i.qtyReceived) < Number(i.qtyOrdered)
  ).length;

  const readyToDispatch = lineItems.filter(
    (i) => Number(i.qtyReceived) > Number(i.qtyDispatched)
  ).length;

  return {
    openPOs,
    pendingMaterial,
    readyToDispatch,
    overdue,
  };
}

// ─── Active POs (10 most recent open/partially fulfilled) ───────────

export async function getActivePOs() {
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

// ─── Division Summary ───────────────────────────────────────────────

export async function getDivisionSummary() {
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
