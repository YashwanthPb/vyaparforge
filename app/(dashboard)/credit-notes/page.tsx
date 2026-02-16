import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { getCreditNotes } from "../reports/actions";

export const metadata: Metadata = {
    title: "Credit Notes | VyaparForge",
};

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: {
        label: "Pending",
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    },
    ADJUSTED: {
        label: "Adjusted",
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    },
    CANCELLED: {
        label: "Cancelled",
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    },
};

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(value);
}

export default async function CreditNotesPage() {
    const creditNotes = await getCreditNotes();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Credit Notes</h2>
                    <p className="text-muted-foreground">
                        Manage credit notes issued to parties.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/credit-notes/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Credit Note
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">All Credit Notes</CardTitle>
                    <CardDescription>{creditNotes.length} credit note{creditNotes.length !== 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent>
                    {creditNotes.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            No credit notes found. Create one to get started.
                        </p>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Credit Note #</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Party</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="text-center">Items</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creditNotes.map((cn) => {
                                        const sCfg = statusConfig[cn.status] ?? statusConfig.PENDING;
                                        return (
                                            <TableRow key={cn.id}>
                                                <TableCell>
                                                    <span className="font-medium">{cn.creditNoteNumber}</span>
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(cn.date), "dd-MM-yyyy")}
                                                </TableCell>
                                                <TableCell>{cn.partyName}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(cn.totalAmount)}
                                                </TableCell>
                                                <TableCell className="text-center">{cn.itemCount}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className={sCfg.className}>
                                                        {sCfg.label}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
