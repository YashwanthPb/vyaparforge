"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createDivisionSchema,
  updateDivisionSchema,
  deleteDivisionSchema,
} from "@/lib/validations";

type DivisionRow = {
  id: string;
  name: string;
  code: string;
  poCount: number;
  createdAt: Date;
};

export async function getDivisions(): Promise<DivisionRow[]> {
  const divisions = await prisma.division.findMany({
    include: { _count: { select: { purchaseOrders: true } } },
    orderBy: { name: "asc" },
  });
  return divisions.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    poCount: d._count.purchaseOrders,
    createdAt: d.createdAt,
  }));
}

export async function createDivision(data: {
  name: string;
  code: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  const parsed = createDivisionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const validated = parsed.data;

  try {
    const existing = await prisma.division.findFirst({
      where: {
        OR: [{ name: validated.name }, { code: validated.code }],
      },
    });
    if (existing) {
      if (existing.name === validated.name) {
        return { success: false, error: "A division with this name already exists." };
      }
      return { success: false, error: "A division with this code already exists." };
    }

    await prisma.division.create({
      data: { name: validated.name, code: validated.code },
    });
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create division." };
  }
}

export async function updateDivision(
  id: string,
  data: { name: string; code: string }
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  const parsed = updateDivisionSchema.safeParse({ id, data });
  if (!parsed.success) {
    return { success: false, error: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const validated = parsed.data;

  try {
    const existing = await prisma.division.findFirst({
      where: {
        OR: [{ name: validated.data.name }, { code: validated.data.code }],
        NOT: { id: validated.id },
      },
    });
    if (existing) {
      if (existing.name === validated.data.name) {
        return { success: false, error: "A division with this name already exists." };
      }
      return { success: false, error: "A division with this code already exists." };
    }

    await prisma.division.update({
      where: { id: validated.id },
      data: { name: validated.data.name, code: validated.data.code },
    });
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update division." };
  }
}

export async function deleteDivision(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  const parsed = deleteDivisionSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: "Validation failed: " + parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const division = await prisma.division.findUnique({
      where: { id: parsed.data.id },
      include: { _count: { select: { purchaseOrders: true } } },
    });
    if (!division) {
      return { success: false, error: "Division not found." };
    }
    if (division._count.purchaseOrders > 0) {
      return {
        success: false,
        error: `Cannot delete: ${division._count.purchaseOrders} purchase order(s) linked to this division.`,
      };
    }

    await prisma.division.delete({ where: { id: parsed.data.id } });
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete division." };
  }
}
