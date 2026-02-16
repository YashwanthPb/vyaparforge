import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPurchaseInvoice } from "../actions";
import { MarkPaidButton } from "./mark-paid-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Purchase Invoice | VyaparForge",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

const statusConfig = {
  UNPAID: {
    label: "Unpaid",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  PARTIALLY_PAID: {
    label: "Partially Paid",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  PAID: {
    label: "Paid",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
};

export default async function PurchaseInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getPurchaseInvoice(id);

  if (!invoice) notFound();

  const statusCfg =
    statusConfig[invoice.paymentStatus] ?? statusConfig.UNPAID;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/purchases">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {invoice.invoiceNumber}
          </h2>
          <p className="text-muted-foreground">Purchase Invoice Detail</p>
        </div>
        <Badge variant="outline" className={statusCfg.className}>
          {statusCfg.label}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Invoice Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Number</span>
              <span className="font-medium">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{format(new Date(invoice.date), "dd-MM-yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier</span>
              <Link
                href={`/parties/${invoice.party.id}`}
                className="font-medium hover:underline"
              >
                {invoice.party.name}
              </Link>
            </div>
            {invoice.party.gstin && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GSTIN</span>
                <span className="font-mono">{invoice.party.gstin}</span>
              </div>
            )}
            {invoice.poNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">PO Number</span>
                <span>{invoice.poNumber}</span>
              </div>
            )}
            {invoice.workOrder && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Work Order</span>
                <span>{invoice.workOrder}</span>
              </div>
            )}
            {invoice.paymentType && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Type</span>
                <span>{invoice.paymentType}</span>
              </div>
            )}
            {invoice.description && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Description</span>
                <span className="text-right">{invoice.description}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-medium">
                  {formatCurrency(invoice.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Paid Amount</span>
                <span className="font-medium text-green-700 dark:text-green-400">
                  {formatCurrency(invoice.paidAmount)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium">Balance Due</span>
                <span className="font-bold text-orange-700 dark:text-orange-400">
                  {formatCurrency(invoice.balanceDue)}
                </span>
              </div>
            </div>

            {invoice.paymentStatus !== "PAID" && (
              <MarkPaidButton
                invoiceId={invoice.id}
                totalAmount={invoice.totalAmount}
                paidAmount={invoice.paidAmount}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
