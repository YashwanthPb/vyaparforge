"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updatePaymentStatus, recordPayment } from "../actions";

export function InvoiceActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");

  async function handleMarkPaid() {
    setSaving(true);
    const result = await updatePaymentStatus(invoiceId, "PAID");
    if (result.success) {
      toast.success("Invoice marked as paid");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update status");
    }
    setSaving(false);
  }

  async function handleMarkSent() {
    setSaving(true);
    const result = await updatePaymentStatus(invoiceId, "SENT");
    if (result.success) {
      toast.success("Invoice marked as sent");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update status");
    }
    setSaving(false);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Payment amount must be greater than 0");
      return;
    }
    if (!paymentDate) {
      toast.error("Payment date is required");
      return;
    }

    setSaving(true);
    const result = await recordPayment({
      invoiceId,
      amount: Number(paymentAmount),
      date: paymentDate,
      mode:
        (paymentMode as "NEFT" | "RTGS" | "CHEQUE" | "UPI" | "CASH") ||
        undefined,
      reference: paymentRef.trim() || undefined,
      remarks: paymentRemarks.trim() || undefined,
    });

    if (result.success) {
      toast.success("Payment recorded successfully");
      setPaymentOpen(false);
      setPaymentAmount("");
      setPaymentDate("");
      setPaymentMode("");
      setPaymentRef("");
      setPaymentRemarks("");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to record payment");
    }
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => window.print()}>
        <Printer className="mr-2 size-4" />
        Print
      </Button>

      {status === "DRAFT" && (
        <Button variant="outline" onClick={handleMarkSent} disabled={saving}>
          <Send className="mr-2 size-4" />
          Mark Sent
        </Button>
      )}

      {(status === "DRAFT" ||
        status === "SENT" ||
        status === "PARTIALLY_PAID") && (
        <Button onClick={handleMarkPaid} disabled={saving}>
          <CheckCircle className="mr-2 size-4" />
          Mark Paid
        </Button>
      )}

      {status !== "PAID" && status !== "CANCELLED" && (
        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Record Payment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (₹) *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Mode</label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select mode" />
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference</label>
                <Input
                  placeholder="Transaction ID / Cheque No."
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Remarks</label>
                <Input
                  placeholder="Optional remarks"
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
