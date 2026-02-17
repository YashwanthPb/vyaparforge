"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ─── Sidebar Badge Counts ────────────────────────────────────────────

export async function getSidebarBadgeCounts() {
    const session = await getServerSession(authOptions);
    if (!session)
        return { unpaidInvoices: 0, unpaidPurchases: 0, activePOs: 0 };

    const [unpaidInvoices, unpaidPurchases, activePOs] = await Promise.all([
        prisma.invoice.count({
            where: { status: { not: "PAID" } },
        }),
        prisma.purchaseInvoice.count({
            where: { paymentStatus: { not: "PAID" } },
        }),
        prisma.purchaseOrder.count({
            where: { status: { in: ["OPEN", "PARTIALLY_FULFILLED"] } },
        }),
    ]);

    return { unpaidInvoices, unpaidPurchases, activePOs };
}

// ─── Global Search ────────────────────────────────────────────────────

export async function globalSearch(query: string) {
    const session = await getServerSession(authOptions);
    if (!session) return { invoices: [], dcs: [], parties: [], pos: [], gatePasses: [] };

    const term = query.trim();
    if (term.length < 2) return { invoices: [], dcs: [], parties: [], pos: [], gatePasses: [] };

    const [invoices, dcs, parties, pos, gatePasses] = await Promise.all([
        prisma.invoice.findMany({
            where: {
                OR: [
                    { invoiceNumber: { contains: term, mode: "insensitive" } },
                    { party: { name: { contains: term, mode: "insensitive" } } },
                ],
            },
            select: {
                id: true,
                invoiceNumber: true,
                date: true,
                totalAmount: true,
                status: true,
                party: { select: { name: true } },
            },
            take: 5,
            orderBy: { date: "desc" },
        }),

        prisma.outwardGatePass.findMany({
            where: {
                OR: [
                    { gpNumber: { contains: term, mode: "insensitive" } },
                    { purchaseOrder: { poNumber: { contains: term, mode: "insensitive" } } },
                ],
            },
            select: {
                id: true,
                gpNumber: true,
                date: true,
                qty: true,
                purchaseOrder: { select: { poNumber: true } },
            },
            take: 5,
            orderBy: { date: "desc" },
        }),

        prisma.party.findMany({
            where: {
                name: { contains: term, mode: "insensitive" },
            },
            select: {
                id: true,
                name: true,
                type: true,
            },
            take: 5,
            orderBy: { name: "asc" },
        }),

        prisma.purchaseOrder.findMany({
            where: {
                poNumber: { contains: term, mode: "insensitive" },
            },
            select: {
                id: true,
                poNumber: true,
                date: true,
                status: true,
                division: { select: { name: true } },
            },
            take: 5,
            orderBy: { date: "desc" },
        }),

        prisma.inwardGatePass.findMany({
            where: {
                OR: [
                    { gpNumber: { contains: term, mode: "insensitive" } },
                    { purchaseOrder: { poNumber: { contains: term, mode: "insensitive" } } },
                ],
            },
            select: {
                id: true,
                gpNumber: true,
                date: true,
                qty: true,
                purchaseOrder: { select: { id: true, poNumber: true } },
            },
            take: 5,
            orderBy: { date: "desc" },
        }),
    ]);

    return {
        invoices: invoices.map((inv) => ({
            id: inv.id,
            title: inv.invoiceNumber,
            subtitle: inv.party?.name ?? "Unknown Party",
            href: `/invoices/${inv.id}`,
            meta: inv.status,
        })),
        dcs: dcs.map((dc) => ({
            id: dc.id,
            title: dc.gpNumber,
            subtitle: dc.purchaseOrder.poNumber,
            href: `/outward-gate-passes/${dc.id}`,
            meta: `Qty: ${Number(dc.qty)}`,
        })),
        parties: parties.map((p) => ({
            id: p.id,
            title: p.name,
            subtitle: p.type,
            href: `/parties/${p.id}`,
        })),
        pos: pos.map((po) => ({
            id: po.id,
            title: po.poNumber,
            subtitle: po.division.name,
            href: `/purchase-orders/${po.id}`,
            meta: po.status,
        })),
        gatePasses: gatePasses.map((gp) => ({
            id: gp.id,
            title: gp.gpNumber,
            subtitle: gp.purchaseOrder.poNumber,
            href: `/purchase-orders/${gp.purchaseOrder.id}`,
            meta: `Qty: ${Number(gp.qty)}`,
        })),
    };
}
