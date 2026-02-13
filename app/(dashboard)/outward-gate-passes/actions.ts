"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createOutwardGatePassSchema,
  searchQuerySchema,
} from "@/lib/validations";

// ─── Get all Outward Gate Passes ────────────────────────────────────

export async function getOutwardGatePasses() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const gatePasses = await prisma.outwardGatePass.findMany({
    include: {
      purchaseOrder: {
        include: {
          division: { select: { name: true } },
        },
      },
      poLineItem: {
        select: { partNumber: true, partName: true },
      },
    },
    orderBy: { date: "desc" },
  });

  return gatePasses.map((gp) => ({
    id: gp.id,
    gpNumber: gp.gpNumber,
    date: gp.date,
    purchaseOrderId: gp.purchaseOrderId,
    poNumber: gp.purchaseOrder.poNumber,
    divisionName: gp.purchaseOrder.division.name,
    partNumber: gp.poLineItem.partNumber,
    partName: gp.poLineItem.partName,
    batchNumber: gp.batchNumber,
    qty: Number(gp.qty),
    vehicleNumber: gp.vehicleNumber,
    challanNumber: gp.challanNumber,
    dispatchDate: gp.dispatchDate,
  }));
}

// ─── Get single Outward Gate Pass ───────────────────────────────────

export async function getOutwardGatePass(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const gatePass = await prisma.outwardGatePass.findUnique({
    where: { id },
    include: {
      purchaseOrder: {
        include: {
          division: true,
        },
      },
      poLineItem: {
        select: {
          partNumber: true,
          partName: true,
          workOrder: true,
          unit: true,
        },
      },
    },
  });

  if (!gatePass) return null;

  return {
    id: gatePass.id,
    gpNumber: gatePass.gpNumber,
    date: gatePass.date,
    purchaseOrderId: gatePass.purchaseOrderId,
    poNumber: gatePass.purchaseOrder.poNumber,
    divisionName: gatePass.purchaseOrder.division.name,
    partNumber: gatePass.poLineItem.partNumber,
    partName: gatePass.poLineItem.partName,
    workOrder: gatePass.poLineItem.workOrder,
    unit: gatePass.poLineItem.unit,
    batchNumber: gatePass.batchNumber,
    qty: Number(gatePass.qty),
    vehicleNumber: gatePass.vehicleNumber,
    challanNumber: gatePass.challanNumber,
    dispatchDate: gatePass.dispatchDate,
    remarks: gatePass.remarks,
  };
}

// ─── Search POs for Dispatch ────────────────────────────────────────

export async function searchPOForDispatch(query: string) {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const parsed = searchQuerySchema.safeParse({ query });
  if (!parsed.success) return [];

  const sanitizedQuery = parsed.data.query;
  if (sanitizedQuery.length < 3) return [];

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: {
      poNumber: { contains: sanitizedQuery, mode: "insensitive" },
      status: { not: "CANCELLED" },
    },
    include: {
      division: { select: { name: true } },
      lineItems: {
        select: {
          id: true,
          partNumber: true,
          partName: true,
          workOrder: true,
          qtyOrdered: true,
          qtyReceived: true,
          qtyDispatched: true,
        },
      },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return purchaseOrders
    .map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      date: po.date,
      deliveryDate: po.deliveryDate,
      remarks: po.remarks,
      divisionName: po.division.name,
      lineItems: po.lineItems.map((item) => ({
        id: item.id,
        partNumber: item.partNumber,
        partName: item.partName,
        workOrder: item.workOrder,
        qtyOrdered: Number(item.qtyOrdered),
        qtyReceived: Number(item.qtyReceived),
        qtyDispatched: Number(item.qtyDispatched),
        dispatchBalance: Number(item.qtyReceived) - Number(item.qtyDispatched),
      })),
    }))
    .filter((po) => po.lineItems.some((item) => item.dispatchBalance > 0));
}

// ─── Create Outward Gate Pass ───────────────────────────────────────

export async function createOutwardGatePass(data: {
  gpNumber: string;
  date: string;
  purchaseOrderId: string;
  poLineItemId: string;
  batchNumber?: string;
  qty: number;
  vehicleNumber?: string;
  challanNumber?: string;
  dispatchDate?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  const parsed = createOutwardGatePassSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const validated = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the line item and validate qty against dispatch balance
      const lineItem = await tx.pOLineItem.findUniqueOrThrow({
        where: { id: validated.poLineItemId },
      });

      const dispatchBalance =
        Number(lineItem.qtyReceived) - Number(lineItem.qtyDispatched);

      if (validated.qty > dispatchBalance) {
        throw new Error(
          `Quantity ${validated.qty} exceeds dispatch balance of ${dispatchBalance}`
        );
      }

      // 2. Create the OutwardGatePass record
      const gatePass = await tx.outwardGatePass.create({
        data: {
          gpNumber: validated.gpNumber,
          date: new Date(validated.date),
          purchaseOrderId: validated.purchaseOrderId,
          poLineItemId: validated.poLineItemId,
          batchNumber: validated.batchNumber || null,
          qty: new Prisma.Decimal(validated.qty),
          vehicleNumber: validated.vehicleNumber || null,
          challanNumber: validated.challanNumber || null,
          dispatchDate: validated.dispatchDate ? new Date(validated.dispatchDate) : null,
        },
      });

      // 3. Increment qtyDispatched on the linked POLineItem
      await tx.pOLineItem.update({
        where: { id: validated.poLineItemId },
        data: {
          qtyDispatched: { increment: new Prisma.Decimal(validated.qty) },
        },
      });

      // 4. Check all line items and update PO status
      const allLineItems = await tx.pOLineItem.findMany({
        where: { purchaseOrderId: validated.purchaseOrderId },
      });

      const allFullyDispatched = allLineItems.every(
        (item) => Number(item.qtyDispatched) >= Number(item.qtyOrdered)
      );

      const someDispatched = allLineItems.some(
        (item) => Number(item.qtyDispatched) > 0
      );

      const someReceived = allLineItems.some(
        (item) => Number(item.qtyReceived) > 0
      );

      let newStatus: "OPEN" | "PARTIALLY_FULFILLED" | "COMPLETED" = "OPEN";
      if (allFullyDispatched) {
        newStatus = "COMPLETED";
      } else if (someDispatched || someReceived) {
        newStatus = "PARTIALLY_FULFILLED";
      }

      await tx.purchaseOrder.update({
        where: { id: validated.purchaseOrderId },
        data: { status: newStatus },
      });

      return gatePass;
    });

    await prisma.auditLog.create({
      data: {
        entity: "OutwardGatePass",
        entityId: result.id,
        action: "CREATE",
        changes: { gpNumber: result.gpNumber, purchaseOrderId: validated.purchaseOrderId },
        userId: session.user.id,
      },
    });

    revalidatePath("/outward-gate-passes");
    revalidatePath("/purchase-orders");
    revalidatePath(`/purchase-orders/${validated.purchaseOrderId}`);

    return { success: true as const, gpNumber: result.gpNumber };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false as const, error: "Dispatch GP number already exists" };
    }
    if (error instanceof Error) {
      return { success: false as const, error: error.message };
    }
    return { success: false as const, error: "Failed to create outward gate pass" };
  }
}
