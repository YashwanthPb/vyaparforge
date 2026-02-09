"use client";

import { useState, useTransition, useMemo } from "react";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { exportToExcel } from "@/lib/export-excel";
import { getPOBalanceReport } from "../actions";

type POBalanceRow = Awaited<ReturnType<typeof getPOBalanceReport>>[number];

interface Division {
  id: string;
  name: string;
  code: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  PARTIALLY_FULFILLED:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  PARTIALLY_FULFILLED: "Partial",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function getRowColor(row: POBalanceRow): string {
  if (row.balance <= 0)
    return "bg-green-50/50 dark:bg-green-950/20";
  if (
    row.deliveryDate &&
    new Date(row.deliveryDate) < new Date() &&
    row.balance > 0
  )
    return "bg-red-50/50 dark:bg-red-950/20";
  if (row.qtyDispatched > 0 && row.balance > 0)
    return "bg-yellow-50/50 dark:bg-yellow-950/20";
  return "";
}

export function POBalanceClient({
  initialData,
  divisions,
}: {
  initialData: POBalanceRow[];
  divisions: Division[];
}) {
  const [data, setData] = useState(initialData);
  const [divisionId, setDivisionId] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPending, startTransition] = useTransition();

  function applyFilters() {
    startTransition(async () => {
      const result = await getPOBalanceReport({
        divisionId: divisionId === "ALL" ? undefined : divisionId,
        status: status === "ALL" ? undefined : status,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setData(result);
    });
  }

  const totals = useMemo(() => {
    return data.reduce(
      (acc, row) => ({
        qtyOrdered: acc.qtyOrdered + row.qtyOrdered,
        qtyReceived: acc.qtyReceived + row.qtyReceived,
        qtyDispatched: acc.qtyDispatched + row.qtyDispatched,
        balance: acc.balance + row.balance,
        balanceValue: acc.balanceValue + row.balanceValue,
      }),
      {
        qtyOrdered: 0,
        qtyReceived: 0,
        qtyDispatched: 0,
        balance: 0,
        balanceValue: 0,
      }
    );
  }, [data]);

  function handleExport() {
    const today = format(new Date(), "dd-MM-yyyy");
    exportToExcel({
      data: data as unknown as Record<string, unknown>[],
      columns: [
        { header: "PO Number", key: "poNumber", width: 18 },
        { header: "Division", key: "division", width: 22 },
        { header: "Part Number", key: "partNumber", width: 16 },
        { header: "Part Name", key: "partName", width: 24 },
        { header: "Work Order", key: "workOrder", width: 16 },
        { header: "Qty Ordered", key: "qtyOrdered", format: "number", width: 14 },
        { header: "Qty Received", key: "qtyReceived", format: "number", width: 14 },
        { header: "Qty Dispatched", key: "qtyDispatched", format: "number", width: 14 },
        { header: "Balance", key: "balance", format: "number", width: 12 },
        { header: "Rate", key: "rate", format: "currency", width: 14 },
        { header: "Balance Value", key: "balanceValue", format: "currency", width: 18 },
        { header: "Status", key: "status", width: 14 },
      ],
      filename: `PO_Balance_Report_${today}`,
      summaryRow: {
        poNumber: "TOTAL",
        qtyOrdered: totals.qtyOrdered,
        qtyReceived: totals.qtyReceived,
        qtyDispatched: totals.qtyDispatched,
        balance: totals.balance,
        balanceValue: totals.balanceValue,
      },
      sheetName: "PO Balance",
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Division
          </label>
          <Select value={divisionId} onValueChange={setDivisionId}>
            <SelectTrigger>
              <SelectValue />
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

        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            PO Status
          </label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="PARTIALLY_FULFILLED">Partial</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Date From
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Date To
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <Button onClick={applyFilters} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Apply
        </Button>

        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Part Number</TableHead>
              <TableHead>Part Name</TableHead>
              <TableHead>Work Order</TableHead>
              <TableHead className="text-right">Qty Ordered</TableHead>
              <TableHead className="text-right">Qty Received</TableHead>
              <TableHead className="text-right">Qty Dispatched</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Balance Value</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="h-24 text-center text-muted-foreground"
                >
                  No data found for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id} className={getRowColor(row)}>
                  <TableCell className="font-medium">{row.poNumber}</TableCell>
                  <TableCell>{row.division}</TableCell>
                  <TableCell>{row.partNumber}</TableCell>
                  <TableCell>{row.partName}</TableCell>
                  <TableCell>{row.workOrder}</TableCell>
                  <TableCell className="text-right">{row.qtyOrdered}</TableCell>
                  <TableCell className="text-right">
                    {row.qtyReceived}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.qtyDispatched}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {row.balance}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.rate)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.balanceValue)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={statusColors[row.status] ?? ""}
                    >
                      {statusLabels[row.status] ?? row.status}
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
                  {totals.qtyOrdered}
                </TableCell>
                <TableCell className="text-right">
                  {totals.qtyReceived}
                </TableCell>
                <TableCell className="text-right">
                  {totals.qtyDispatched}
                </TableCell>
                <TableCell className="text-right">{totals.balance}</TableCell>
                <TableCell />
                <TableCell className="text-right">
                  {formatCurrency(totals.balanceValue)}
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
