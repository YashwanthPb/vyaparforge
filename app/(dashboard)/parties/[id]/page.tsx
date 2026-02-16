import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getParty } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Party Detail | VyaparForge",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

const invoiceStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
  SENT: { label: "Sent", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  PARTIALLY_PAID: { label: "Partial", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

const purchaseStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  UNPAID: { label: "Unpaid", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  PARTIALLY_PAID: { label: "Partial", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
  PAID: { label: "Paid", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
};

const typeConfig: Record<string, { label: string; className: string }> = {
  CUSTOMER: { label: "Customer", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  SUPPLIER: { label: "Supplier", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  BOTH: { label: "Both", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
};

export default async function PartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const party = await getParty(id);

  if (!party) notFound();

  const typeCfg = typeConfig[party.type] ?? typeConfig.BOTH;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/parties">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{party.name}</h2>
          <p className="text-muted-foreground">Party details and transactions</p>
        </div>
      </div>

      {/* Party Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Party Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <Badge variant="outline" className={typeCfg.className}>
                {typeCfg.label}
              </Badge>
            </div>
            {party.gstin && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GSTIN</span>
                <span className="font-mono">{party.gstin}</span>
              </div>
            )}
            {party.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{party.phone}</span>
              </div>
            )}
            {party.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{party.email}</span>
              </div>
            )}
            {party.address && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Address</span>
                <span className="text-right">{party.address}</span>
              </div>
            )}
            {party.isHAL && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">HAL Party</span>
                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Yes</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Balance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-4">
              <p className="text-sm text-muted-foreground">Outstanding Receivable</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {formatCurrency(party.receivableBalance)}
              </p>
            </div>
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/40 p-4">
              <p className="text-sm text-muted-foreground">Outstanding Payable</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {formatCurrency(party.payableBalance)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sale Invoices */}
      {party.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sale Invoices</CardTitle>
            <CardDescription>
              {party.invoices.length} invoice{party.invoices.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {party.invoices.map((inv) => {
                    const statusCfg = invoiceStatusConfig[inv.status] ?? invoiceStatusConfig.DRAFT;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="font-medium hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {format(new Date(inv.date), "dd-MM-yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(inv.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.balanceDue > 0
                            ? formatCurrency(inv.balanceDue)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={statusCfg.className}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Invoices */}
      {party.purchaseInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Purchase Invoices</CardTitle>
            <CardDescription>
              {party.purchaseInvoices.length} invoice{party.purchaseInvoices.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {party.purchaseInvoices.map((inv) => {
                    const statusCfg =
                      purchaseStatusConfig[inv.paymentStatus] ??
                      purchaseStatusConfig.UNPAID;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <Link
                            href={`/purchases/${inv.id}`}
                            className="font-medium hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {format(new Date(inv.date), "dd-MM-yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(inv.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.balanceDue > 0
                            ? formatCurrency(inv.balanceDue)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={statusCfg.className}
                          >
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {party.invoices.length === 0 && party.purchaseInvoices.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No transactions found for this party.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
