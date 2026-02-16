"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createPurchaseInvoice } from "./actions";

type PurchaseRow = {
  id: string;
  invoiceNumber: string;
  date: Date;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
};

type Supplier = { id: string; name: string };

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

const statusConfig: Record<
  PurchaseRow["paymentStatus"],
  { label: string; className: string }
> = {
  UNPAID: {
    label: "Unpaid",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  PARTIALLY_PAID: {
    label: "Partial",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  PAID: {
    label: "Paid",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
};

const emptyForm = {
  partyId: "",
  invoiceNumber: "",
  date: "",
  totalAmount: "",
  paymentType: "",
  poNumber: "",
  workOrder: "",
  description: "",
};

export function PurchaseTable({
  invoices,
  suppliers,
}: {
  invoices: PurchaseRow[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isPending, startTransition] = useTransition();

  const filtered = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      inv.paymentStatus.toLowerCase().includes(search.toLowerCase())
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.totalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    startTransition(async () => {
      const result = await createPurchaseInvoice({
        partyId: form.partyId,
        invoiceNumber: form.invoiceNumber,
        date: form.date,
        totalAmount: amount,
        paymentType: form.paymentType,
        poNumber: form.poNumber,
        workOrder: form.workOrder,
        description: form.description,
      });

      if (result.success) {
        toast.success("Purchase invoice created");
        setShowDialog(false);
        setForm(emptyForm);
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by invoice or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 size-4" />
          New Purchase Invoice
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground h-24 text-center"
                >
                  {search
                    ? "No purchase invoices match your search."
                    : "No purchase invoices yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => {
                const statusCfg = statusConfig[inv.paymentStatus];
                return (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/purchases/${inv.id}`)}
                  >
                    <TableCell className="font-medium">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      {format(new Date(inv.date), "dd-MM-yyyy")}
                    </TableCell>
                    <TableCell>{inv.supplierName}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(inv.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.paidAmount > 0
                        ? formatCurrency(inv.paidAmount)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium text-orange-700 dark:text-orange-400">
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
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Purchase Invoice Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Purchase Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Select
                value={form.partyId}
                onValueChange={(v) => setForm({ ...form, partyId: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-number">Invoice Number *</Label>
                <Input
                  id="inv-number"
                  required
                  value={form.invoiceNumber}
                  onChange={(e) =>
                    setForm({ ...form, invoiceNumber: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-date">Date *</Label>
                <Input
                  id="inv-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.totalAmount}
                  onChange={(e) =>
                    setForm({ ...form, totalAmount: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-type">Payment Type</Label>
                <Select
                  value={form.paymentType}
                  onValueChange={(v) => setForm({ ...form, paymentType: v })}
                >
                  <SelectTrigger id="payment-type">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="po-number">PO Number</Label>
                <Input
                  id="po-number"
                  value={form.poNumber}
                  onChange={(e) =>
                    setForm({ ...form, poNumber: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="work-order">Work Order</Label>
                <Input
                  id="work-order"
                  value={form.workOrder}
                  onChange={(e) =>
                    setForm({ ...form, workOrder: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !form.partyId}>
                {isPending ? "Creating…" : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
