"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Filter, Printer } from "lucide-react";
import { getPartyStatement } from "../../reports/actions";
import { exportToExcel, type ColumnDef } from "@/lib/export-excel";

type StatementEntry = {
    id: string;
    date: string;
    type: "SALE" | "PAYMENT_RECEIVED" | "PURCHASE" | "CREDIT_NOTE";
    reference: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
};

type StatementData = {
    party: {
        id: string;
        name: string;
        gstin: string | null;
        phone: string | null;
        address: string | null;
        receivableBalance: number;
        payableBalance: number;
    };
    entries: StatementEntry[];
    openingBalance: number;
    closingBalance: number;
} | null;

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(value);
}

const typeBadge: Record<string, { label: string; className: string }> = {
    SALE: {
        label: "Sale",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    },
    PAYMENT_RECEIVED: {
        label: "Payment",
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    },
    PURCHASE: {
        label: "Purchase",
        className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    },
    CREDIT_NOTE: {
        label: "Cr. Note",
        className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    },
};

export function PartyStatement({ partyId }: { partyId: string }) {
    const [data, setData] = useState<StatementData>(null);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    async function loadStatement() {
        setLoading(true);
        const result = await getPartyStatement(
            partyId,
            dateFrom || undefined,
            dateTo || undefined
        );
        setData(result);
        setLoading(false);
    }

    useEffect(() => {
        loadStatement();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleFilter() {
        loadStatement();
    }

    function handleClearFilter() {
        setDateFrom("");
        setDateTo("");
        // Need to reload after clearing
        setTimeout(() => {
            getPartyStatement(partyId).then((result) => {
                setData(result);
            });
        }, 0);
    }

    function handleExport() {
        if (!data) return;

        const columns: ColumnDef[] = [
            { header: "Date", key: "date", width: 14, format: "date" },
            { header: "Type", key: "typeName", width: 12 },
            { header: "Reference", key: "reference", width: 20 },
            { header: "Description", key: "description", width: 35 },
            { header: "Debit", key: "debit", width: 16, format: "currency" },
            { header: "Credit", key: "credit", width: 16, format: "currency" },
            { header: "Balance", key: "balance", width: 16, format: "currency" },
        ];

        const rows = data.entries.map((e) => ({
            date: new Date(e.date).toLocaleDateString("en-IN"),
            typeName: typeBadge[e.type]?.label ?? e.type,
            reference: e.reference,
            description: e.description,
            debit: e.debit || "",
            credit: e.credit || "",
            balance: e.balance,
        }));

        exportToExcel({
            data: rows as unknown as Record<string, unknown>[],
            columns,
            filename: `party-statement-${data.party.name}`,
            sheetName: "Statement",
        });
    }

    function handlePrint() {
        window.print();
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    Loading statement...
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    Statement not available.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="print:border-none print:shadow-none">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Account Statement</CardTitle>
                        <CardDescription>
                            Chronological ledger with running balance
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                            <Printer className="h-4 w-4" />
                            Print
                        </Button>
                    </div>
                </div>

                {/* Date Filter */}
                <div className="flex items-end gap-3 pt-3 print:hidden">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">From</label>
                        <Input
                            type="date"
                            className="h-8 w-36"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">To</label>
                        <Input
                            type="date"
                            className="h-8 w-36"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={handleFilter} className="gap-1 h-8">
                        <Filter className="h-3 w-3" />
                        Apply
                    </Button>
                    {(dateFrom || dateTo) && (
                        <Button variant="ghost" size="sm" onClick={handleClearFilter} className="h-8">
                            Clear
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {/* Opening Balance */}
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 mb-4">
                    <span className="text-sm font-medium text-muted-foreground">
                        Opening Balance
                    </span>
                    <span
                        className={`text-sm font-bold ${data.openingBalance >= 0
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                    >
                        {formatCurrency(Math.abs(data.openingBalance))}
                        {data.openingBalance >= 0 ? " Dr" : " Cr"}
                    </span>
                </div>

                {data.entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                        No transactions found for the selected period.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-24">Date</TableHead>
                                    <TableHead className="w-20">Type</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Debit</TableHead>
                                    <TableHead className="text-right">Credit</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.entries.map((entry) => {
                                    const badge = typeBadge[entry.type] ?? typeBadge.SALE;
                                    return (
                                        <TableRow key={entry.id + entry.type}>
                                            <TableCell className="text-xs">
                                                {new Date(entry.date).toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "2-digit",
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-[10px] ${badge.className}`}>
                                                    {badge.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">{entry.reference}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {entry.description}
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                {entry.debit > 0 ? formatCurrency(entry.debit) : ""}
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                                {entry.credit > 0 ? formatCurrency(entry.credit) : ""}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right text-sm font-medium ${entry.balance >= 0
                                                        ? "text-blue-600 dark:text-blue-400"
                                                        : "text-red-600 dark:text-red-400"
                                                    }`}
                                            >
                                                {formatCurrency(Math.abs(entry.balance))}
                                                {entry.balance >= 0 ? " Dr" : " Cr"}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Closing Balance */}
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 mt-4">
                    <span className="text-sm font-medium text-muted-foreground">
                        Closing Balance
                    </span>
                    <span
                        className={`text-sm font-bold ${data.closingBalance >= 0
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                    >
                        {formatCurrency(Math.abs(data.closingBalance))}
                        {data.closingBalance >= 0 ? " Dr" : " Cr"}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
