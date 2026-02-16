"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { markPurchaseInvoicePaid } from "../actions";

export function MarkPaidButton({
  invoiceId,
  totalAmount,
  paidAmount,
}: {
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [amount, setAmount] = useState(
    (totalAmount - paidAmount).toFixed(2)
  );
  const [isPending, startTransition] = useTransition();

  function handlePay() {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    startTransition(async () => {
      const result = await markPurchaseInvoicePaid(
        invoiceId,
        paidAmount + val
      );
      if (result.success) {
        toast.success("Payment recorded");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to record payment");
      }
    });
  }

  if (!show) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setShow(true)}>
        Record Payment
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="pay-amount">Payment Amount</Label>
        <Input
          id="pay-amount"
          type="number"
          min="0.01"
          step="0.01"
          max={totalAmount - paidAmount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setShow(false)}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handlePay}
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Record Payment"}
        </Button>
      </div>
    </div>
  );
}
