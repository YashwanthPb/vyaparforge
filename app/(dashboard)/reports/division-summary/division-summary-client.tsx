"use client";

import { format } from "date-fns";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { getDivisionSummary } from "../actions";

type DivisionRow = Awaited<ReturnType<typeof getDivisionSummary>>[number];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function DivisionSummaryClient({ data }: { data: DivisionRow[] }) {
  const totals = data.reduce(
    (acc, row) => ({
      totalPOs: acc.totalPOs + row.totalPOs,
      openPOs: acc.openPOs + row.openPOs,
      totalOrderedValue: acc.totalOrderedValue + row.totalOrderedValue,
      totalDispatchedValue:
        acc.totalDispatchedValue + row.totalDispatchedValue,
      totalInvoiced: acc.totalInvoiced + row.totalInvoiced,
      totalReceived: acc.totalReceived + row.totalReceived,
      outstanding: acc.outstanding + row.outstanding,
    }),
    {
      totalPOs: 0,
      openPOs: 0,
      totalOrderedValue: 0,
      totalDispatchedValue: 0,
      totalInvoiced: 0,
      totalReceived: 0,
      outstanding: 0,
    }
  );

  function handleExport() {
    const today = format(new Date(), "dd-MM-yyyy");
    exportToExcel({
      data: data as unknown as Record<string, unknown>[],
      columns: [
        { header: "Division", key: "division", width: 24 },
        { header: "Code", key: "code", width: 8 },
        { header: "Total POs", key: "totalPOs", format: "number", width: 12 },
        { header: "Open POs", key: "openPOs", format: "number", width: 12 },
        {
          header: "Total Ordered Value",
          key: "totalOrderedValue",
          format: "currency",
          width: 20,
        },
        {
          header: "Total Dispatched Value",
          key: "totalDispatchedValue",
          format: "currency",
          width: 22,
        },
        {
          header: "Total Invoiced",
          key: "totalInvoiced",
          format: "currency",
          width: 18,
        },
        {
          header: "Total Received",
          key: "totalReceived",
          format: "currency",
          width: 18,
        },
        {
          header: "Outstanding",
          key: "outstanding",
          format: "currency",
          width: 18,
        },
      ],
      filename: `Division_Summary_${today}`,
      summaryRow: {
        division: "TOTAL",
        totalPOs: totals.totalPOs,
        openPOs: totals.openPOs,
        totalOrderedValue: totals.totalOrderedValue,
        totalDispatchedValue: totals.totalDispatchedValue,
        totalInvoiced: totals.totalInvoiced,
        totalReceived: totals.totalReceived,
        outstanding: totals.outstanding,
      },
      sheetName: "Division Summary",
    });
  }

  return (
    <div className="space-y-4">
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
              <TableHead>Division</TableHead>
              <TableHead className="text-right">Total POs</TableHead>
              <TableHead className="text-right">Open POs</TableHead>
              <TableHead className="text-right">Total Ordered Value</TableHead>
              <TableHead className="text-right">
                Total Dispatched Value
              </TableHead>
              <TableHead className="text-right">Total Invoiced</TableHead>
              <TableHead className="text-right">Total Received</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No divisions found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.division}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({row.code})
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{row.totalPOs}</TableCell>
                  <TableCell className="text-right">{row.openPOs}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.totalOrderedValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.totalDispatchedValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.totalInvoiced)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.totalReceived)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {row.outstanding > 0 ? (
                      <span className="text-red-600 dark:text-red-400">
                        {formatCurrency(row.outstanding)}
                      </span>
                    ) : (
                      formatCurrency(row.outstanding)
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {data.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">
                  {totals.totalPOs}
                </TableCell>
                <TableCell className="text-right">{totals.openPOs}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totals.totalOrderedValue)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totals.totalDispatchedValue)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totals.totalInvoiced)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totals.totalReceived)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totals.outstanding)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
