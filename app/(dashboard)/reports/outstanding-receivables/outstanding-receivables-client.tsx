"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { exportToExcel } from "@/lib/export-excel";
import { getOutstandingReceivables } from "../actions";

type Row = Awaited<ReturnType<typeof getOutstandingReceivables>>[number];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getAgeBadgeClass(days: number): string {
  if (days > 90) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  if (days > 30) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
}

export function OutstandingReceivablesClient({ data }: { data: Row[] }) {
  const totalOutstanding = useMemo(
    () => data.reduce((sum, r) => sum + r.outstandingAmount, 0),
    [data]
  );

  function handleExport() {
    const today = format(new Date(), "dd-MM-yyyy");
    exportToExcel({
      data: data as unknown as Record<string, unknown>[],
      columns: [
        { header: "Invoice Number", key: "invoiceNumber", width: 22 },
        { header: "Date", key: "date", format: "date", width: 14 },
        { header: "Party", key: "partyName", width: 24 },
        { header: "PO Number", key: "poNumber", width: 18 },
        { header: "Division", key: "division", width: 22 },
        { header: "Total Amount", key: "totalAmount", format: "currency", width: 16 },
        { header: "Paid Amount", key: "paidAmount", format: "currency", width: 16 },
        { header: "Outstanding", key: "outstandingAmount", format: "currency", width: 16 },
        { header: "Age (Days)", key: "daysOverdue", format: "number", width: 12 },
      ],
      filename: `Outstanding_Receivables_${today}`,
      summaryRow: {
        invoiceNumber: "TOTAL",
        totalAmount: data.reduce((s, r) => s + r.totalAmount, 0),
        paidAmount: data.reduce((s, r) => s + r.paidAmount, 0),
        outstandingAmount: totalOutstanding,
      },
      sheetName: "Outstanding Receivables",
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total Outstanding Receivables</p>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {data.length} invoice{data.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>PO Number</TableHead>
              <TableHead>Division</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-center">Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No outstanding receivables. All invoices are paid!
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.invoiceNumber}</TableCell>
                  <TableCell>{format(new Date(row.date), "dd-MM-yyyy")}</TableCell>
                  <TableCell>{row.partyName}</TableCell>
                  <TableCell>{row.poNumber}</TableCell>
                  <TableCell>{row.division}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.totalAmount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.paidAmount)}</TableCell>
                  <TableCell className="text-right font-medium text-blue-700 dark:text-blue-400">
                    {formatCurrency(row.outstandingAmount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={getAgeBadgeClass(row.daysOverdue)}>
                      {row.daysOverdue}d
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {data.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell colSpan={5}>TOTAL</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(data.reduce((s, r) => s + r.totalAmount, 0))}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(data.reduce((s, r) => s + r.paidAmount, 0))}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalOutstanding)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
