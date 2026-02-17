"use client";

import { useState, useTransition, useCallback } from "react";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  getPOLedgerData,
  type POLedgerRow,
  type POLedgerSummary,
  type POLedgerFilters,
} from "./actions";

// ─── Types ──────────────────────────────────────────────────────────

type Division = {
  id: string;
  name: string;
  code: string;
};

type Props = {
  initialRows: POLedgerRow[];
  initialSummary: POLedgerSummary;
  divisions: Division[];
};

// ─── Helpers ────────────────────────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  PARTIALLY_FULFILLED: {
    label: "Partial",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function getRowColorClass(row: POLedgerRow): string {
  if (row.balance === 0) return "bg-green-50 dark:bg-green-950/20";
  if (row.isOverdue) return "bg-red-50 dark:bg-red-950/20";
  if (row.qtyDispatched > 0) return "bg-amber-50 dark:bg-amber-950/20";
  return "";
}

function progressPercent(dispatched: number, ordered: number): number {
  if (ordered === 0) return 0;
  return Math.min(Math.round((dispatched / ordered) * 100), 100);
}

// ─── CSV Export ─────────────────────────────────────────────────────

function completionColor(pct: number): string {
  if (pct >= 100) return "text-green-700 dark:text-green-400";
  if (pct >= 50) return "text-amber-700 dark:text-amber-400";
  return "text-red-700 dark:text-red-400";
}

function progressBarColor(pct: number): string {
  if (pct >= 100) return "bg-green-500";
  if (pct > 0) return "bg-amber-500";
  return "bg-muted";
}

function exportToCSV(rows: POLedgerRow[], summary: POLedgerSummary) {
  const headers = [
    "PO Number",
    "Division",
    "Part Number",
    "Part Name",
    "Work Order",
    "Qty Ordered",
    "Qty Received",
    "Qty Dispatched",
    "Balance",
    "Completion %",
    "Rate (INR)",
    "Total Value (INR)",
    "Total Invoiced (INR)",
    "Balance Value (INR)",
    "Status",
  ];

  const csvRows = rows.map((r) => [
    r.poNumber,
    r.divisionName,
    r.partNumber,
    r.partName,
    r.workOrder ?? "",
    r.qtyOrdered,
    r.qtyReceived,
    r.qtyDispatched,
    r.balance,
    r.completionPct,
    r.rate,
    r.totalValue,
    r.totalInvoiced,
    r.balanceValue,
    r.poStatus,
  ]);

  const summaryRow = [
    "TOTAL",
    "",
    "",
    "",
    "",
    summary.totalOrdered,
    summary.totalReceived,
    summary.totalDispatched,
    summary.totalBalance,
    "",
    "",
    summary.totalValue,
    summary.totalInvoiced,
    summary.totalBalanceValue,
    "",
  ];

  const csvContent = [
    headers.join(","),
    ...csvRows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          return str.includes(",") ? `"${str}"` : str;
        })
        .join(",")
    ),
    summaryRow.join(","),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `po-ledger-${format(new Date(), "dd-MM-yyyy")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Component ──────────────────────────────────────────────────────

export function POLedgerTable({
  initialRows,
  initialSummary,
  divisions,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [summary, setSummary] = useState(initialSummary);
  const [isPending, startTransition] = useTransition();

  const [divisionId, setDivisionId] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const applyFilters = useCallback(
    (
      nextDivision: string,
      nextStatus: string,
      nextFrom: string,
      nextTo: string
    ) => {
      startTransition(async () => {
        const filters: POLedgerFilters = {};
        if (nextDivision !== "ALL") filters.divisionId = nextDivision;
        if (nextStatus !== "ALL")
          filters.status = nextStatus as POLedgerFilters["status"];
        if (nextFrom) filters.dateFrom = nextFrom;
        if (nextTo) filters.dateTo = nextTo;

        const data = await getPOLedgerData(filters);
        setRows(data.rows);
        setSummary(data.summary);
      });
    },
    []
  );

  const handleDivisionChange = (value: string) => {
    setDivisionId(value);
    applyFilters(value, status, dateFrom, dateTo);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    applyFilters(divisionId, value, dateFrom, dateTo);
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateFrom(value);
    applyFilters(divisionId, status, value, dateTo);
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateTo(value);
    applyFilters(divisionId, status, dateFrom, value);
  };

  const handleReset = () => {
    setDivisionId("ALL");
    setStatus("ALL");
    setDateFrom("");
    setDateTo("");
    applyFilters("ALL", "ALL", "", "");
  };

  return (
    <div className="space-y-4">
      {/* ─── Summary Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-[10px] font-medium">Ordered</p>
            <p className="text-lg font-bold">{formatNumber(summary.totalOrdered)}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-[10px] font-medium">Received</p>
            <p className="text-lg font-bold">{formatNumber(summary.totalReceived)}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-[10px] font-medium">Dispatched</p>
            <p className="text-lg font-bold">{formatNumber(summary.totalDispatched)}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-[10px] font-medium">Balance</p>
            <p className="text-lg font-bold">{formatNumber(summary.totalBalance)}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-[10px] font-medium">Total Value</p>
            <p className="text-lg font-bold">{formatINR(summary.totalValue)}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-[10px] font-medium">Total Invoiced</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatINR(summary.totalInvoiced)}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-[10px] font-medium">Balance Value</p>
            <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{formatINR(summary.totalBalanceValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Filter Bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">
            Division
          </label>
          <Select value={divisionId} onValueChange={handleDivisionChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Divisions</SelectItem>
              {divisions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">
            Status
          </label>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="PARTIALLY_FULFILLED">Partial</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">
            From Date
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={handleDateFromChange}
            className="w-[150px]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-muted-foreground text-xs font-medium">
            To Date
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={handleDateToChange}
            className="w-[150px]"
          />
        </div>

        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset
        </Button>

        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(rows, summary)}
          >
            <Download className="mr-2 size-4" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* ─── Loading indicator ──────────────────────────────────── */}
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Updating...
        </div>
      )}

      {/* ─── Table ──────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Part Number</TableHead>
              <TableHead>Part Name</TableHead>
              <TableHead>Work Order</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Dispatched</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-center">Completion %</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="text-right">Invoiced</TableHead>
              <TableHead className="text-right">Balance Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={14}
                  className="text-muted-foreground h-24 text-center"
                >
                  No line items found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const pct = row.completionPct;
                return (
                  <TableRow key={row.id} className={getRowColorClass(row)}>
                    <TableCell className="font-medium">
                      {row.poNumber}
                    </TableCell>
                    <TableCell>{row.divisionName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.partNumber}
                    </TableCell>
                    <TableCell>{row.partName}</TableCell>
                    <TableCell>{row.workOrder ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(row.qtyOrdered)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(row.qtyReceived)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(row.qtyDispatched)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(row.balance)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="bg-muted h-2 w-16 overflow-hidden rounded-full">
                          <div
                            className={`h-full rounded-full transition-all ${progressBarColor(pct)}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className={`w-9 text-xs font-semibold ${completionColor(pct)}`}>
                          {pct}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatINR(row.rate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatINR(row.totalValue)}
                    </TableCell>
                    <TableCell className="text-right text-green-700 dark:text-green-400">
                      {row.totalInvoiced > 0 ? formatINR(row.totalInvoiced) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.isOverdue && (
                        <Badge
                          variant="destructive"
                          className="mr-1 text-[10px]"
                        >
                          Overdue
                        </Badge>
                      )}
                      {formatINR(row.balanceValue)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow className="font-semibold">
                <TableCell colSpan={5}>
                  Total ({summary.rowCount} line items)
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(summary.totalOrdered)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(summary.totalReceived)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(summary.totalDispatched)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(summary.totalBalance)}
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right">
                  {formatINR(summary.totalValue)}
                </TableCell>
                <TableCell className="text-right text-green-700 dark:text-green-400">
                  {formatINR(summary.totalInvoiced)}
                </TableCell>
                <TableCell className="text-right">
                  {formatINR(summary.totalBalanceValue)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* ─── Legend ──────────────────────────────────────────────── */}
      <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-green-200 dark:bg-green-900" />
          Fully Dispatched
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-amber-200 dark:bg-amber-900" />
          Partially Dispatched
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-red-200 dark:bg-red-900" />
          Overdue
        </div>
      </div>
    </div>
  );
}
