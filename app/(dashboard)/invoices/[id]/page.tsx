import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { getInvoice } from "../actions";
import { InvoiceActions } from "./invoice-actions";
import { PaymentReminder } from "./payment-reminder";
import { InvoicePreview } from "./invoice-preview";
import { amountInWords } from "@/lib/amount-in-words";
import {
  DEFAULT_SELLER,
  DEFAULT_BUYER,
} from "@/components/invoice-templates/types";
import type { InvoiceData, CompanyInfo } from "@/components/invoice-templates/types";
import { getCompanyProfile } from "../../settings/actions";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { label: string; className: string }> = {
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function buildSellerFromProfile(profile: {
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
  state: string;
  stateCode: string;
}): CompanyInfo {
  // Derive PAN from GSTIN characters 3-12 (0-indexed: indices 2–11)
  const pan = profile.gstin.length >= 12 ? profile.gstin.substring(2, 12) : "";

  return {
    name: profile.name || DEFAULT_SELLER.name,
    tagline: DEFAULT_SELLER.tagline,
    address: profile.address || DEFAULT_SELLER.address,
    city: DEFAULT_SELLER.city,
    state: profile.state || DEFAULT_SELLER.state,
    stateCode: profile.stateCode || DEFAULT_SELLER.stateCode,
    pincode: DEFAULT_SELLER.pincode,
    gstin: profile.gstin || DEFAULT_SELLER.gstin,
    pan: pan || DEFAULT_SELLER.pan,
    phone: profile.phone || DEFAULT_SELLER.phone,
    email: profile.email || DEFAULT_SELLER.email,
    bankName: DEFAULT_SELLER.bankName,
    bankBranch: DEFAULT_SELLER.bankBranch,
    accountNumber: DEFAULT_SELLER.accountNumber,
    ifscCode: DEFAULT_SELLER.ifscCode,
  };
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

  // Fetch company profile from DB for seller details
  const companyProfile = await getCompanyProfile();
  const seller: CompanyInfo = companyProfile
    ? buildSellerFromProfile(companyProfile)
    : DEFAULT_SELLER;

  const status = statusConfig[invoice.status];
  const totalPaid = invoice.payments
    .filter((p) => p.status === "RECEIVED")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Number(invoice.totalAmount) - totalPaid;

  const subtotal = Number(invoice.subtotal);
  const cgst = Number(invoice.cgst);
  const sgst = Number(invoice.sgst);
  const igst = Number(invoice.igst);
  const grandTotal = Number(invoice.totalAmount);

  // Build buyer info from party data and defaults
  const buyerInfo = {
    ...DEFAULT_BUYER,
    name: invoice.party?.name ?? DEFAULT_BUYER.name,
    division: invoice.purchaseOrder?.division.name ?? "",
    address: DEFAULT_BUYER.address,
    city: DEFAULT_BUYER.city,
    state: DEFAULT_BUYER.state,
    stateCode: DEFAULT_BUYER.stateCode,
    gstin: DEFAULT_BUYER.gstin,
  };

  // Build InvoiceData for templates
  const invoiceData: InvoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    date: format(new Date(invoice.date), "dd-MM-yyyy"),
    poReference: invoice.purchaseOrder?.poNumber ?? invoice.poReference ?? "",
    deliveryNote: invoice.dcNumber ?? "",
    placeOfSupply: `${buyerInfo.state} (${buyerInfo.stateCode})`,
    workOrderRef: invoice.workOrderRef ?? null,
    batchNumberRef: invoice.batchNumberRef ?? null,
    status: invoice.status as "UNPAID" | "PARTIALLY_PAID" | "PAID",
    seller,
    buyer: buyerInfo,
    items: invoice.items.map((item, index) => ({
      sno: index + 1,
      partNumber: item.poLineItem?.partNumber ?? "",
      description: item.poLineItem?.partName ?? item.partName ?? "",
      hsnSac: item.hsnCode ?? invoice.hsnCode ?? "7326",
      workOrder: item.poLineItem?.workOrder ?? "",
      qty: Number(item.qty),
      unit: item.unit ?? item.poLineItem?.unit ?? "NOS",
      rate: Number(item.rate),
      amount: Number(item.amount),
    })),
    subtotal,
    cgst,
    sgst,
    igst,
    totalTax: cgst + sgst + igst,
    grandTotal,
    amountInWords: amountInWords(grandTotal),
    remarks: invoice.remarks,
  };

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
            {invoice.status !== "PAID" && (
              <PaymentReminder
                partyName={invoice.party?.name ?? "Party"}
                invoiceNumber={invoice.invoiceNumber}
                invoiceDate={invoice.date.toISOString()}
                totalAmount={grandTotal}
                balanceDue={balanceDue}
                status={invoice.status}
              />
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            PO: {invoice.purchaseOrder?.poNumber ?? "N/A"} —{" "}
            {invoice.purchaseOrder?.division.name ?? ""}
          </p>
        </div>
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
      </div>

      {/* Themed Invoice Preview */}
      <InvoicePreview data={invoiceData} />

      {/* Payment History (screen only) */}
      {invoice.payments.length > 0 && (
        <div className="print:hidden">
          <Separator className="my-4" />
          <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
            Payments
          </p>
          <div className="overflow-x-auto rounded-md border">
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
          </div>
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
      )}
    </div>
  );
}
