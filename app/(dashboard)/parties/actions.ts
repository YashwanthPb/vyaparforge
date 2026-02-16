"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Get all Parties ─────────────────────────────────────────────────

export async function getParties() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const parties = await prisma.party.findMany({
    orderBy: { name: "asc" },
  });

  return parties.map((p) => ({
    id: p.id,
    name: p.name,
    gstin: p.gstin ?? "",
    phone: p.phone ?? "",
    email: p.email ?? "",
    address: p.address ?? "",
    type: p.type,
    isHAL: p.isHAL,
    receivableBalance: Number(p.receivableBalance),
    payableBalance: Number(p.payableBalance),
  }));
}

// ─── Get single Party ────────────────────────────────────────────────

export async function getParty(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const party = await prisma.party.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { date: "desc" },
        take: 50,
        select: {
          id: true,
          invoiceNumber: true,
          date: true,
          totalAmount: true,
          status: true,
          balanceDue: true,
        },
      },
      purchaseInvoices: {
        orderBy: { date: "desc" },
        take: 50,
        select: {
          id: true,
          invoiceNumber: true,
          date: true,
          totalAmount: true,
          paymentStatus: true,
          balanceDue: true,
        },
      },
    },
  });

  if (!party) return null;

  return {
    ...party,
    receivableBalance: Number(party.receivableBalance),
    payableBalance: Number(party.payableBalance),
    creditLimit: party.creditLimit ? Number(party.creditLimit) : null,
    invoices: party.invoices.map((inv) => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
      balanceDue: Number(inv.balanceDue),
    })),
    purchaseInvoices: party.purchaseInvoices.map((inv) => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
      balanceDue: Number(inv.balanceDue),
    })),
  };
}

// ─── Create Party ────────────────────────────────────────────────────

export async function createParty(data: {
  name: string;
  gstin?: string;
  phone?: string;
  email?: string;
  address?: string;
  type: "CUSTOMER" | "SUPPLIER" | "BOTH";
}) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  if (!data.name?.trim()) {
    return { success: false as const, error: "Name is required" };
  }

  try {
    const party = await prisma.party.create({
      data: {
        name: data.name.trim(),
        gstin: data.gstin?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        type: data.type,
      },
    });
    revalidatePath("/parties");
    return { success: true as const, id: party.id };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return {
        success: false as const,
        error: "A party with this name already exists",
      };
    }
    return { success: false as const, error: "Failed to create party" };
  }
}

// ─── Update Party ────────────────────────────────────────────────────

export async function updateParty(
  id: string,
  data: {
    name?: string;
    gstin?: string;
    phone?: string;
    email?: string;
    address?: string;
    type?: "CUSTOMER" | "SUPPLIER" | "BOTH";
  }
) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  try {
    await prisma.party.update({
      where: { id },
      data: {
        ...(data.name?.trim() && { name: data.name.trim() }),
        gstin: data.gstin?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        ...(data.type && { type: data.type }),
      },
    });
    revalidatePath("/parties");
    revalidatePath(`/parties/${id}`);
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Failed to update party" };
  }
}

// ─── Delete Party ────────────────────────────────────────────────────

export async function deleteParty(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Unauthorized" };

  try {
    await prisma.party.delete({ where: { id } });
    revalidatePath("/parties");
    return { success: true as const };
  } catch {
    return {
      success: false as const,
      error: "Cannot delete party with existing records",
    };
  }
}
