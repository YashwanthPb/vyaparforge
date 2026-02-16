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
import { Card, CardContent } from "@/components/ui/card";
import { exportToExcel } from "@/lib/export-excel";
import { getInvoiceRegister } from "../actions";

type InvoiceRow = Awaited<ReturnType<typeof getInvoiceRegister>>[number];

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

const paymentStatusColors: Record<string, string> = {
  Paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Partial:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  Unpaid: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export function InvoiceRegisterClient({
  initialData,
  divisions,
}: {
  initialData: InvoiceRow[];
  divisions: Division[];
}) {
  const [data, setData] = useState(initialData);
  const [divisionId, setDivisionId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isPending, startTransition] = useTransition();

  function applyFilters() {
    startTransition(async () => {
      const result = await getInvoiceRegister({
        divisionId: divisionId === "ALL" ? undefined : divisionId,
        status:
          statusFilter === "ALL"
            ? undefined
            : statusFilter === "Paid"
              ? "PAID"
              : statusFilter === "Unpaid"
                ? "UNPAID"
                : "PARTIALLY_PAID",
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setData(result);
    });
  }

  const summary = useMemo(() => {
    return data.reduce(
      (acc, row) => ({
        totalInvoiced: acc.totalInvoiced + row.totalAmount,
        totalReceived: acc.totalReceived + row.totalPaid,
        totalOutstanding: acc.totalOutstanding + row.outstanding,
      }),
      { totalInvoiced: 0, totalReceived: 0, totalOutstanding: 0 }
    );
  }, [data]);

  function handleExport() {
    const today = format(new Date(), "dd-MM-yyyy");
    exportToExcel({
      data: data as unknown as Record<string, unknown>[],
      columns: [
        { header: "Invoice Number", key: "invoiceNumber", width: 22 },
        { header: "Date", key: "date", format: "date", width: 14 },
        { header: "PO Number", key: "poNumber", width: 18 },
        { header: "Division", key: "division", width: 22 },
        { header: "Subtotal", key: "subtotal", format: "currency", width: 16 },
        { header: "CGST", key: "cgst", format: "currency", width: 14 },
        { header: "SGST", key: "sgst", format: "currency", width: 14 },
        { header: "IGST", key: "igst", format: "currency", width: 14 },
        {
          header: "Total",
          key: "totalAmount",
          format: "currency",
          width: 16,
        },
        {
          header: "Payment Status",
          key: "paymentStatus",
          width: 16,
        },
      ],
      filename: `Invoice_Register_${today}`,
      summaryRow: {
        invoiceNumber: "TOTAL",
        subtotal: data.reduce((s, r) => s + r.subtotal, 0),
        cgst: data.reduce((s, r) => s + r.cgst, 0),
        sgst: data.reduce((s, r) => s + r.sgst, 0),
        igst: data.reduce((s, r) => s + r.igst, 0),
        totalAmount: summary.totalInvoiced,
      },
      sheetName: "Invoice Register",
    });
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Invoiced</p>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totalInvoiced)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Received</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalReceived)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalOutstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

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

        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Payment Status
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
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
              <TableHead>Invoice Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>PO Number</TableHead>
              <TableHead>Division</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">CGST</TableHead>
              <TableHead className="text-right">SGST</TableHead>
              <TableHead className="text-right">IGST</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Payment Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-muted-foreground"
                >
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    {format(new Date(row.date), "dd-MM-yyyy")}
                  </TableCell>
                  <TableCell>{row.poNumber}</TableCell>
                  <TableCell>{row.division}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.subtotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.cgst)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.sgst)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(row.igst)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.totalAmount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        paymentStatusColors[row.paymentStatus] ?? ""
                      }
                    >
                      {row.paymentStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {data.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold">
                <TableCell colSpan={4}>TOTAL</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(data.reduce((s, r) => s + r.subtotal, 0))}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(data.reduce((s, r) => s + r.cgst, 0))}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(data.reduce((s, r) => s + r.sgst, 0))}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(data.reduce((s, r) => s + r.igst, 0))}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(summary.totalInvoiced)}
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
