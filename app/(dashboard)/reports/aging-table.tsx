"use client";

import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToExcel, type ColumnDef } from "@/lib/export-excel";

type AgingRow = {
    partyId: string;
    partyName: string;
    current: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
    total: number;
};

function formatCurrency(value: number): string {
    if (value === 0) return "—";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(value);
}

export function AgingTable({
    data,
    title,
    type,
}: {
    data: AgingRow[];
    title: string;
    type: "receivables" | "payables";
}) {
    const totals = data.reduce(
        (acc, row) => ({
            current: acc.current + row.current,
            days31_60: acc.days31_60 + row.days31_60,
            days61_90: acc.days61_90 + row.days61_90,
            days90Plus: acc.days90Plus + row.days90Plus,
            total: acc.total + row.total,
        }),
        { current: 0, days31_60: 0, days61_90: 0, days90Plus: 0, total: 0 }
    );

    function handleExport() {
        const columns: ColumnDef[] = [
            { header: "Party Name", key: "partyName", width: 30 },
            { header: "Current (0-30)", key: "current", width: 16, format: "currency" },
            { header: "31-60 Days", key: "days31_60", width: 16, format: "currency" },
            { header: "61-90 Days", key: "days61_90", width: 16, format: "currency" },
            { header: "90+ Days", key: "days90Plus", width: 16, format: "currency" },
            { header: "Total Outstanding", key: "total", width: 18, format: "currency" },
        ];

        exportToExcel({
            data: data as unknown as Record<string, unknown>[],
            columns,
            filename: `${type}-aging-report`,
            summaryRow: {
                partyName: "GRAND TOTAL",
                current: totals.current,
                days31_60: totals.days31_60,
                days61_90: totals.days61_90,
                days90Plus: totals.days90Plus,
                total: totals.total,
            },
            sheetName: title,
        });
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{title}</CardTitle>
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Excel
                </Button>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                        No outstanding {type} found.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Party Name</TableHead>
                                    <TableHead className="text-right">Current (0-30)</TableHead>
                                    <TableHead className="text-right">31-60 Days</TableHead>
                                    <TableHead className="text-right">61-90 Days</TableHead>
                                    <TableHead className="text-right">90+ Days</TableHead>
                                    <TableHead className="text-right font-bold">Total Outstanding</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((row) => (
                                    <TableRow key={row.partyId}>
                                        <TableCell>
                                            <Link
                                                href={`/parties/${row.partyId}`}
                                                className="font-medium hover:underline"
                                            >
                                                {row.partyName}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(row.current)}</TableCell>
                                        <TableCell className="text-right text-orange-600 dark:text-orange-400">
                                            {formatCurrency(row.days31_60)}
                                        </TableCell>
                                        <TableCell className="text-right text-orange-700 dark:text-orange-300">
                                            {formatCurrency(row.days61_90)}
                                        </TableCell>
                                        <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                                            {formatCurrency(row.days90Plus)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(row.total)}</TableCell>
                                    </TableRow>
                                ))}
                                {/* Grand Total Row */}
                                <TableRow className="bg-muted/50 font-bold">
                                    <TableCell>GRAND TOTAL</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totals.current)}</TableCell>
                                    <TableCell className="text-right text-orange-600">{formatCurrency(totals.days31_60)}</TableCell>
                                    <TableCell className="text-right text-orange-700">{formatCurrency(totals.days61_90)}</TableCell>
                                    <TableCell className="text-right text-red-600">{formatCurrency(totals.days90Plus)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
