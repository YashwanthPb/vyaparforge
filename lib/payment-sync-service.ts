import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface PaymentRecord {
    invoiceNumber: string;
    netAmount: number;
    utrNumber: string;
    utrTotal: number;
    date: string | Date;
    division: string;
    poNumber: string;
    grossAmount: number;
    diffPercent: number;
    confidence: string;
    mailLink: string;
}

export async function processPaymentRecords(records: PaymentRecord[], userId: string = "SYSTEM_SYNC") {
    const results = {
        matched: 0,
        unmatched: 0,
        errors: 0,
        details: [] as any[],
    };

    for (const record of records) {
        try {
            let paymentDate: Date;
            if (record.date instanceof Date) {
                paymentDate = record.date;
            } else {
                const dateStr = record.date.replace(" ", "T");
                paymentDate = new Date(dateStr);
                if (isNaN(paymentDate.getTime())) {
                    // Fallback or throw?
                    // Try assuming it's just YYYY-MM-DD?
                    paymentDate = new Date(record.date);
                    if (isNaN(paymentDate.getTime())) throw new Error(`Invalid date: ${record.date}`);
                }
            }

            const cleanInvoiceNumber = record.invoiceNumber.trim();

            const invoice = await prisma.invoice.findFirst({
                where: {
                    invoiceNumber: {
                        equals: cleanInvoiceNumber,
                        mode: "insensitive",
                    },
                },
            });

            let status: "MATCHED" | "UNMATCHED" = "UNMATCHED";
            let matchedInvoiceId: string | undefined;
            let matchedPaymentId: string | undefined;

            if (invoice) {
                status = "MATCHED";
                matchedInvoiceId = invoice.id;
            }

            // Check if this UTR already exists to prevent duplicates?
            // Requirement doesn't explicitly ask for deduplication, but "Invoice Number" + "UTR" + "Amount" usually unique.
            // We will just create PaymentSync record as log.

            const paymentSync = await prisma.paymentSync.create({
                data: {
                    invoiceNumber: record.invoiceNumber,
                    netAmount: record.netAmount,
                    grossAmount: record.grossAmount,
                    utrNumber: record.utrNumber,
                    utrTotal: record.utrTotal,
                    paymentDate: paymentDate,
                    division: record.division,
                    poNumber: record.poNumber,
                    tdsPercent: record.diffPercent,
                    confidence: record.confidence,
                    mailLink: record.mailLink,
                    status: status,
                    matchedInvoiceId: matchedInvoiceId,
                },
            });

            if (status === "MATCHED" && invoice) {
                const payment = await prisma.payment.create({
                    data: {
                        invoiceId: invoice.id,
                        amount: record.netAmount,
                        date: paymentDate,
                        mode: "NEFT",
                        reference: record.utrNumber,
                        status: "RECEIVED",
                        remarks: `Auto-synced. UTR: ${record.utrNumber}`,
                    }
                });

                matchedPaymentId = payment.id;

                await prisma.paymentSync.update({
                    where: { id: paymentSync.id },
                    data: { matchedPaymentId: payment.id }
                });

                const newPaidAmount = new Prisma.Decimal(invoice.paidAmount).plus(record.netAmount);
                const newBalanceDue = new Prisma.Decimal(invoice.totalAmount).minus(newPaidAmount);

                let newStatus = invoice.status;
                if (newBalanceDue.lte(0)) {
                    newStatus = "PAID";
                } else if (newPaidAmount.gt(0)) {
                    newStatus = "PARTIALLY_PAID";
                }

                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        paidAmount: newPaidAmount,
                        balanceDue: newBalanceDue,
                        status: newStatus,
                    }
                });

                await prisma.auditLog.create({
                    data: {
                        entity: "Payment",
                        entityId: payment.id,
                        action: "CREATE",
                        changes: {
                            message: `Auto-recorded payment of ${record.netAmount} for Invoice ${invoice.invoiceNumber} via UTR ${record.utrNumber}`,
                            source: "PaymentSync",
                            syncId: paymentSync.id
                        },
                        userId: userId
                    }
                });

                results.matched++;
            } else {
                results.unmatched++;
            }

            results.details.push({
                invoice: record.invoiceNumber,
                status,
                syncId: paymentSync.id
            });

        } catch (err: any) {
            console.error(`Error processing record ${record.invoiceNumber}:`, err);
            results.errors++;
            results.details.push({
                invoice: record.invoiceNumber,
                status: "ERROR",
                error: err.message
            });
        }
    }

    return results;
}
