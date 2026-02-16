"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getPartyList() {
    const session = await getServerSession(authOptions);
    if (!session) return [];

    return prisma.party.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });
}
