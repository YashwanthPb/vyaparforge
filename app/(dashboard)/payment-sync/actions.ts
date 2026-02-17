"use server";

import { prisma } from "@/lib/db";
import { PaymentSyncStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getPaymentSyncRecords(filters?: {
    status?: PaymentSyncStatus;
    division?: string;
    dateRange?: { from: Date; to: Date };
}) {
    const where: Prisma.PaymentSyncWhereInput = {};

    if (filters?.status) {
        where.status = filters.status;
    }
    if (filters?.division) {
        where.division = filters.division;
    }
    if (filters?.dateRange) {
        where.paymentDate = {
            gte: filters.dateRange.from,
            lte: filters.dateRange.to,
        };
    }

    const records = await prisma.paymentSync.findMany({
        where,
        orderBy: { paymentDate: "desc" },
        include: {
            matchedInvoice: true,
            matchedPayment: true,
        },
        take: 100, // Limit for performance
    });

    return records;
}

export async function manualMatchPayment(syncId: string, invoiceId: string) {
    try {
        const syncRecord = await prisma.paymentSync.findUnique({
            where: { id: syncId },
        });

        if (!syncRecord) throw new Error("Sync record not found");
        if (syncRecord.status === "MATCHED") throw new Error("Already matched");

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
        });

        if (!invoice) throw new Error("Invoice not found");

        // Create Payment
        const payment = await prisma.payment.create({
            data: {
                invoiceId: invoice.id,
                amount: syncRecord.netAmount,
                date: syncRecord.paymentDate,
                mode: "NEFT",
                reference: syncRecord.utrNumber,
                status: "RECEIVED",
                remarks: `Manually matched from Sync Record. UTR: ${syncRecord.utrNumber}`,
            },
        });

        // Update Invoice
        // Use Decimal operations safely
        const paidAmount = new Prisma.Decimal(invoice.paidAmount).plus(syncRecord.netAmount);
        const balanceDue = new Prisma.Decimal(invoice.totalAmount).minus(paidAmount);

        let newStatus = invoice.status;
        if (balanceDue.lte(0)) newStatus = "PAID";
        else if (paidAmount.gt(0)) newStatus = "PARTIALLY_PAID";

        await prisma.invoice.update({
            where: { id: invoice.id },
            data: {
                paidAmount,
                balanceDue,
                status: newStatus,
            },
        });

        // Update Sync Record
        await prisma.paymentSync.update({
            where: { id: syncId },
            data: {
                status: "MATCHED",
                matchedInvoiceId: invoice.id,
                matchedPaymentId: payment.id,
            },
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                entity: "PaymentSync",
                entityId: syncId,
                action: "UPDATE",
                changes: {
                    message: `Manually matched PaymentSync ${syncId} to Invoice ${invoice.invoiceNumber}`,
                    previousStatus: syncRecord.status
                },
                userId: "MANUAL_USER", // roughly
            },
        });

        revalidatePath("/payment-sync");
        return { success: true };
    } catch (error: any) {
        console.error("Manual Match Error:", error);
        return { success: false, error: error.message };
    }
}

export async function ignorePayment(syncId: string) {
    try {
        await prisma.paymentSync.update({
            where: { id: syncId },
            data: { status: "IGNORED" },
        });
        revalidatePath("/payment-sync");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function searchInvoices(query: string) {
    if (!query || query.length < 2) return [];

    return await prisma.invoice.findMany({
        where: {
            OR: [
                { invoiceNumber: { contains: query, mode: "insensitive" } },
                { party: { name: { contains: query, mode: "insensitive" } } }
            ]
        },
        select: {
            id: true,
            invoiceNumber: true,
            date: true,
            totalAmount: true,
            balanceDue: true,
            party: { select: { name: true } }
        },
        take: 10
    });
}

import { processPaymentRecords, PaymentRecord } from "@/lib/payment-sync-service";

export async function processBulkUpload(records: PaymentRecord[]) {
    try {
        const results = await processPaymentRecords(records, "MANUAL_UPLOAD");
        revalidatePath("/payment-sync");
        return { success: true, results };
    } catch (error: any) {
        console.error("Bulk Upload Error:", error);
        return { success: false, error: error.message };
    }
}
