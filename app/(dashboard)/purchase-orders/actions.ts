"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  deletePurchaseOrderSchema,
  getByIdSchema,
} from "@/lib/validations";

// ─── Get all Purchase Orders ────────────────────────────────────────

export async function getPurchaseOrders() {
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: {
      division: true,
      lineItems: {
        select: {
          qtyOrdered: true,
          qtyReceived: true,
          qtyDispatched: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return purchaseOrders.map((po) => {
    const totalOrdered = po.lineItems.reduce(
      (sum, item) => sum + Number(item.qtyOrdered),
      0
    );
    const totalReceived = po.lineItems.reduce(
      (sum, item) => sum + Number(item.qtyReceived),
      0
    );
    const totalDispatched = po.lineItems.reduce(
      (sum, item) => sum + Number(item.qtyDispatched),
      0
    );

    return {
      id: po.id,
      poNumber: po.poNumber,
      divisionName: po.division.name,
      date: po.date,
      status: po.status,
      itemCount: po.lineItems.length,
      totalOrdered,
      totalReceived,
      totalDispatched,
      balance: totalOrdered - totalDispatched,
    };
  });
}

// ─── Get single Purchase Order ──────────────────────────────────────

export async function getPurchaseOrder(id: string) {
  const parsed = getByIdSchema.safeParse({ id });
  if (!parsed.success) {
    return null;
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: parsed.data.id },
    include: {
      division: true,
      lineItems: {
        orderBy: { createdAt: "asc" },
      },
      inwardGatePasses: {
        include: {
          poLineItem: {
            select: { partNumber: true, partName: true },
          },
        },
        orderBy: { date: "desc" },
      },
      outwardGatePasses: {
        include: {
          poLineItem: {
            select: { partNumber: true, partName: true },
          },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  return po;
}

// ─── Get all Divisions ──────────────────────────────────────────────

export async function getDivisions() {
  return prisma.division.findMany({
    orderBy: { name: "asc" },
  });
}

// ─── Create Purchase Order ──────────────────────────────────────────

export async function createPurchaseOrder(data: {
  poNumber: string;
  divisionId: string;
  date: string;
  deliveryDate?: string;
  remarks?: string;
  lineItems: {
    partNumber: string;
    partName: string;
    workOrder?: string;
    qtyOrdered: number;
    rate: number;
    unit: "NOS" | "KG" | "MTR" | "SET" | "LOT";
  }[];
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  const parsed = createPurchaseOrderSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const validated = parsed.data;

  try {
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: validated.poNumber,
        divisionId: validated.divisionId,
        date: new Date(validated.date),
        deliveryDate: validated.deliveryDate ? new Date(validated.deliveryDate) : null,
        remarks: validated.remarks || null,
        lineItems: {
          create: validated.lineItems.map((item) => ({
            partNumber: item.partNumber,
            partName: item.partName,
            workOrder: item.workOrder || null,
            qtyOrdered: new Prisma.Decimal(item.qtyOrdered),
            rate: new Prisma.Decimal(item.rate),
            unit: item.unit,
          })),
        },
      },
    });

    revalidatePath("/purchase-orders");
    return { success: true, id: po.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "PO Number already exists" };
    }
    return { success: false, error: "Failed to create purchase order" };
  }
}

// ─── Update Purchase Order ──────────────────────────────────────────

export async function updatePurchaseOrder(
  id: string,
  data: {
    poNumber?: string;
    divisionId?: string;
    date?: string;
    deliveryDate?: string;
    remarks?: string;
    status?: "OPEN" | "PARTIALLY_FULFILLED" | "COMPLETED" | "CANCELLED";
  }
) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  const parsed = updatePurchaseOrderSchema.safeParse({ id, data });
  if (!parsed.success) {
    return { success: false, error: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const validated = parsed.data;

  // Only CANCELLED is allowed as a manual status change
  if (validated.data.status === "CANCELLED") {
    // Check no gate passes exist for this PO
    const [inwardCount, outwardCount] = await Promise.all([
      prisma.inwardGatePass.count({ where: { purchaseOrderId: validated.id } }),
      prisma.outwardGatePass.count({ where: { purchaseOrderId: validated.id } }),
    ]);

    if (inwardCount > 0 || outwardCount > 0) {
      return {
        success: false,
        error: "Cannot cancel: gate passes already exist for this PO",
      };
    }
  }

  try {
    await prisma.purchaseOrder.update({
      where: { id: validated.id },
      data: {
        ...(validated.data.poNumber && { poNumber: validated.data.poNumber }),
        ...(validated.data.divisionId && { divisionId: validated.data.divisionId }),
        ...(validated.data.date && { date: new Date(validated.data.date) }),
        ...(validated.data.deliveryDate !== undefined && {
          deliveryDate: validated.data.deliveryDate ? new Date(validated.data.deliveryDate) : null,
        }),
        ...(validated.data.remarks !== undefined && { remarks: validated.data.remarks || null }),
        ...(validated.data.status && { status: validated.data.status }),
      },
    });

    revalidatePath("/purchase-orders");
    revalidatePath(`/purchase-orders/${validated.id}`);
    return { success: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "PO Number already exists" };
    }
    return { success: false, error: "Failed to update purchase order" };
  }
}

// ─── Delete Purchase Order ──────────────────────────────────────────

export async function deletePurchaseOrder(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  const parsed = deletePurchaseOrderSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    await prisma.purchaseOrder.delete({
      where: { id: parsed.data.id },
    });

    revalidatePath("/purchase-orders");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete purchase order" };
  }
}
