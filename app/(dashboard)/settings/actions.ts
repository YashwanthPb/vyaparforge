"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createDivisionSchema,
  updateDivisionSchema,
  deleteDivisionSchema,
  changePasswordSchema,
} from "@/lib/validations";
import bcrypt from "bcryptjs";




type DivisionRow = {
  id: string;
  name: string;
  code: string;
  poCount: number;
  createdAt: Date;
};

export async function getDivisions(): Promise<DivisionRow[]> {
  const session = await getServerSession(authOptions);
  if (!session) return [];

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
  if (session.user.role !== "ADMIN") return { success: false, error: "Access denied. Admin role required." };

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

// ─── Company Profile ────────────────────────────────────────────────

export type CompanyProfileData = {
  id: string;
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  state: string;
  stateCode: string;
};

export async function getCompanyProfile(): Promise<CompanyProfileData | null> {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = await (prisma as any).companyProfile.findFirst();
  if (!profile) return null;

  return {
    id: profile.id,
    name: profile.name,
    gstin: profile.gstin,
    address: profile.address,
    phone: profile.phone,
    email: profile.email,
    state: profile.state,
    stateCode: profile.stateCode,
  };
}

export async function updateCompanyProfile(data: {
  name: string;
  gstin?: string;
  address?: string;
  phone?: string;
  email?: string;
  state?: string;
  stateCode?: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { success: false, error: "Access denied. Admin role required." };

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: "Company name is required." };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const existing = await db.companyProfile.findFirst();
    if (existing) {
      await db.companyProfile.update({
        where: { id: existing.id },
        data: {
          name: data.name.trim(),
          gstin: data.gstin?.trim() ?? "",
          address: data.address?.trim() ?? "",
          phone: data.phone?.trim() ?? "",
          email: data.email?.trim() ?? "",
          state: data.state?.trim() ?? "",
          stateCode: data.stateCode?.trim() ?? "",
        },
      });
    } else {
      await db.companyProfile.create({
        data: {
          name: data.name.trim(),
          gstin: data.gstin?.trim() ?? "",
          address: data.address?.trim() ?? "",
          phone: data.phone?.trim() ?? "",
          email: data.email?.trim() ?? "",
          state: data.state?.trim() ?? "",
          stateCode: data.stateCode?.trim() ?? "",
        },
      });
    }
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save company profile." };
  }
}

// ─── User Management ────────────────────────────────────────────────

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
  createdAt: Date;
};

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least 1 uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least 1 lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least 1 number.";
  return null;
}

export async function getUsers(): Promise<UserRow[]> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return [];

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return users as UserRow[];
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "USER";
}): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  if (!data.name?.trim()) return { success: false, error: "Name is required." };
  if (!data.email?.trim()) return { success: false, error: "Email is required." };
  if (!data.password) return { success: false, error: "Password is required." };

  const pwErr = validatePassword(data.password);
  if (pwErr) return { success: false, error: pwErr };

  try {
    const existing = await prisma.user.findUnique({ where: { email: data.email.trim().toLowerCase() } });
    if (existing) return { success: false, error: "A user with this email already exists." };

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: hashed,
        role: data.role,
      },
    });

    await prisma.auditLog.create({
      data: {
        entity: "User",
        entityId: user.id,
        action: "CREATE",
        changes: { message: `Created user ${user.email}` },
        userId: session.user.id,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create user." };
  }
}

export async function updateUser(
  id: string,
  data: { name: string; email: string; role: "ADMIN" | "USER" }
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  if (!data.name?.trim()) return { success: false, error: "Name is required." };
  if (!data.email?.trim()) return { success: false, error: "Email is required." };

  try {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return { success: false, error: "User not found." };

    // Cannot demote last ADMIN
    if (target.role === "ADMIN" && data.role === "USER") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) return { success: false, error: "Cannot demote the last ADMIN user." };
    }

    const emailConflict = await prisma.user.findFirst({
      where: { email: data.email.trim().toLowerCase(), NOT: { id } },
    });
    if (emailConflict) return { success: false, error: "A user with this email already exists." };

    await prisma.user.update({
      where: { id },
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        role: data.role,
      },
    });

    await prisma.auditLog.create({
      data: {
        entity: "User",
        entityId: id,
        action: "UPDATE",
        changes: { message: `Updated user ${data.email}` },
        userId: session.user.id,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update user." };
  }
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  if (session.user.id === id) return { success: false, error: "Cannot delete your own account." };

  try {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return { success: false, error: "User not found." };

    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) return { success: false, error: "Cannot delete the last ADMIN user." };
    }

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        entity: "User",
        entityId: id,
        action: "DELETE",
        changes: { message: `Deleted user ${target.email}` },
        userId: session.user.id,
      },
    });

    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete user." };
  }
}

export async function resetUserPassword(
  id: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return { success: false, error: "Unauthorized" };

  const pwErr = validatePassword(newPassword);
  if (pwErr) return { success: false, error: pwErr };

  try {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return { success: false, error: "User not found." };

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id }, data: { password: hashed } });

    await prisma.auditLog.create({
      data: {
        entity: "User",
        entityId: id,
        action: "UPDATE",
        changes: { message: `Reset password for ${target.email}` },
        userId: session.user.id,
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to reset password." };
  }
}

// ─── Change Own Password ─────────────────────────────────────────────

// ─── Change Own Password ─────────────────────────────────────────────

export async function changeMyPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false, error: "Unauthorized" };

  // Use the same password for confirmPassword since the UI already checked they match
  // and we want to validate complexity rules in the schema.
  const validationResult = changePasswordSchema.safeParse({
    currentPassword,
    newPassword,
    confirmPassword: newPassword
  });

  if (!validationResult.success) {
    return { success: false, error: "Validation failed: " + validationResult.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return { success: false, error: "User not found." };

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return { success: false, error: "Current password is incorrect." };

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    await prisma.auditLog.create({
      data: {
        entity: "User",
        entityId: user.id,
        action: "UPDATE",
        changes: { message: "Changed own password" },
        userId: session.user.id,
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to change password." };
  }
}
