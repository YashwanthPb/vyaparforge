import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { getInvoice } from "../actions";
import { InvoiceActions } from "./invoice-actions";

export const dynamic = "force-dynamic";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  },
  SENT: {
    label: "Sent",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);

  if (!invoice) {
    notFound();
  }

  const status = statusConfig[invoice.status];
  const totalPaid = invoice.payments
    .filter((p) => p.status === "RECEIVED")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Number(invoice.totalAmount) - totalPaid;

  return (
    <div className="space-y-6">
      {/* Screen-only header with actions */}
      <div className="flex items-start justify-between print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {invoice.invoiceNumber}
            </h2>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            PO: {invoice.purchaseOrder.poNumber} —{" "}
            {invoice.purchaseOrder.division.name}
          </p>
        </div>
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
      </div>

      {/* Printable Invoice */}
      <Card className="print:border-none print:shadow-none">
        <CardContent className="p-8">
          {/* Company Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Shri Shakthi Industries</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Aerospace Fabrication Supplier
              </p>
              <p className="text-muted-foreground text-sm">
                Karnataka, India
              </p>
              <p className="text-muted-foreground text-sm">
                GSTIN: 29XXXXX0000X0ZX
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">TAX INVOICE</h2>
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Invoice No:</span>{" "}
                <span className="font-medium">{invoice.invoiceNumber}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Date:</span>{" "}
                <span className="font-medium">
                  {format(new Date(invoice.date), "dd-MM-yyyy")}
                </span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">PO No:</span>{" "}
                <span className="font-medium">
                  {invoice.purchaseOrder.poNumber}
                </span>
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Bill To */}
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Bill To
            </p>
            <p className="mt-1 font-semibold">
              Hindustan Aeronautics Limited
            </p>
            <p className="text-muted-foreground text-sm">
              {invoice.purchaseOrder.division.name}
            </p>
            <p className="text-muted-foreground text-sm">Karnataka, India</p>
          </div>

          <Separator className="my-6" />

          {/* Items Table */}
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">S.No</TableHead>
                <TableHead>Part Number</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate (₹)</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">
                    {item.poLineItem.partNumber}
                  </TableCell>
                  <TableCell>
                    {item.poLineItem.partName}
                    {item.poLineItem.workOrder && (
                      <span className="text-muted-foreground block text-xs">
                        WO: {item.poLineItem.workOrder}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.qty)} {item.poLineItem.unit}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(item.rate))}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(item.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-80 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(Number(invoice.subtotal))}
                </span>
              </div>
              {Number(invoice.cgst) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST (9%)</span>
                  <span>{formatCurrency(Number(invoice.cgst))}</span>
                </div>
              )}
              {Number(invoice.sgst) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST (9%)</span>
                  <span>{formatCurrency(Number(invoice.sgst))}</span>
                </div>
              )}
              {Number(invoice.igst) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGST (18%)</span>
                  <span>{formatCurrency(Number(invoice.igst))}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Grand Total</span>
                <span>{formatCurrency(Number(invoice.totalAmount))}</span>
              </div>
            </div>
          </div>

          {/* Payment History (screen only) */}
          {invoice.payments.length > 0 && (
            <>
              <Separator className="my-6 print:hidden" />
              <div className="print:hidden">
                <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
                  Payments
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.date), "dd-MM-yyyy")}
                        </TableCell>
                        <TableCell>{payment.mode || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.reference || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(payment.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-3 flex justify-end">
                  <div className="w-80 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Paid</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(totalPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Balance Due</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(balanceDue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {invoice.remarks && (
            <>
              <Separator className="my-6" />
              <p className="text-muted-foreground text-sm">
                <span className="font-medium">Remarks:</span>{" "}
                {invoice.remarks}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
