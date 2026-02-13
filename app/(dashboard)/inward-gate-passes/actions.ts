"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createInwardGatePassSchema,
  searchQuerySchema,
} from "@/lib/validations";

// ─── Get all Inward Gate Passes ─────────────────────────────────────

export async function getInwardGatePasses() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const gatePasses = await prisma.inwardGatePass.findMany({
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
  }));
}

// ─── Search Purchase Orders ─────────────────────────────────────────

export async function searchPurchaseOrder(query: string) {
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
        balance: Number(item.qtyOrdered) - Number(item.qtyReceived),
      })),
    }))
    .filter((po) => po.lineItems.some((item) => item.balance > 0));
}

// ─── Create Inward Gate Pass ────────────────────────────────────────

export async function createInwardGatePass(data: {
  gpNumber: string;
  date: string;
  purchaseOrderId: string;
  poLineItemId: string;
  batchNumber?: string;
  qty: number;
  vehicleNumber?: string;
  challanNumber?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  const parsed = createInwardGatePassSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const validated = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the line item and validate qty against balance
      const lineItem = await tx.pOLineItem.findUniqueOrThrow({
        where: { id: validated.poLineItemId },
      });

      const balance =
        Number(lineItem.qtyOrdered) - Number(lineItem.qtyReceived);

      if (validated.qty > balance) {
        throw new Error(
          `Quantity ${validated.qty} exceeds available balance of ${balance}`
        );
      }

      // 2. Create the InwardGatePass record
      const gatePass = await tx.inwardGatePass.create({
        data: {
          gpNumber: validated.gpNumber,
          date: new Date(validated.date),
          purchaseOrderId: validated.purchaseOrderId,
          poLineItemId: validated.poLineItemId,
          batchNumber: validated.batchNumber || null,
          qty: new Prisma.Decimal(validated.qty),
          vehicleNumber: validated.vehicleNumber || null,
          challanNumber: validated.challanNumber || null,
        },
      });

      // 3. Increment qtyReceived on the linked POLineItem
      await tx.pOLineItem.update({
        where: { id: validated.poLineItemId },
        data: {
          qtyReceived: { increment: new Prisma.Decimal(validated.qty) },
        },
      });

      // 4. Check all line items and update PO status
      const allLineItems = await tx.pOLineItem.findMany({
        where: { purchaseOrderId: validated.purchaseOrderId },
      });

      const allFullyReceived = allLineItems.every(
        (item) => Number(item.qtyReceived) >= Number(item.qtyOrdered)
      );

      const someReceived = allLineItems.some(
        (item) => Number(item.qtyReceived) > 0
      );

      let newStatus: "OPEN" | "PARTIALLY_FULFILLED" | "COMPLETED" = "OPEN";
      if (allFullyReceived) {
        newStatus = "COMPLETED";
      } else if (someReceived) {
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
        entity: "InwardGatePass",
        entityId: result.id,
        action: "CREATE",
        changes: { gpNumber: result.gpNumber, purchaseOrderId: validated.purchaseOrderId },
        userId: session.user.id,
      },
    });

    revalidatePath("/inward-gate-passes");
    revalidatePath("/purchase-orders");
    revalidatePath(`/purchase-orders/${validated.purchaseOrderId}`);

    return { success: true as const, gpNumber: result.gpNumber };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false as const, error: "Gate Pass number already exists" };
    }
    if (error instanceof Error) {
      return { success: false as const, error: error.message };
    }
    return { success: false as const, error: "Failed to create gate pass" };
  }
}
