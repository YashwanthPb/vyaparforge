import { prisma } from "@/lib/db";
import { PaymentSyncList } from "./payment-sync-list";
import { UploadButton } from "./upload-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Prisma } from "@prisma/client";

export const metadata = {
    title: "Payment Sync | VyaparForge",
};

async function getStats() {
    const totalCount = await prisma.paymentSync.count();
    const matchedCount = await prisma.paymentSync.count({ where: { status: "MATCHED" } });
    const unmatchedCount = await prisma.paymentSync.count({ where: { status: "UNMATCHED" } });

    // Sum netAmount for matched records
    const result = await prisma.paymentSync.aggregate({
        where: { status: "MATCHED" },
        _sum: { netAmount: true },
    });

    return {
        total: totalCount,
        matched: matchedCount,
        unmatched: unmatchedCount,
        totalAmount: result._sum.netAmount || 0,
    };
}

export default async function PaymentSyncPage() {
    const stats = await getStats();

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Payment Sync</h1>
                    <p className="text-muted-foreground">
                        Monitor and reconcile payments from connected sources.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <UploadButton />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Synced</CardTitle>
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Matched</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Unmatched</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.unmatched}</div>
                        <p className="text-xs text-muted-foreground">Action required</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <span className="text-xs font-bold">₹</span>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Number(stats.totalAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <PaymentSyncList />
        </div>
    );
}
