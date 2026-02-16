"use client";

import { useState } from "react";
import { MessageSquare, Copy, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface PaymentReminderProps {
    partyName: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    balanceDue: number;
    status: string;
}

function getDaysOverdue(invoiceDateStr: string): number {
    const invoiceDate = new Date(invoiceDateStr);
    const today = new Date();
    const diff = today.getTime() - invoiceDate.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getOverdueColor(days: number): {
    bg: string;
    text: string;
    badge: string;
    label: string;
} {
    if (days <= 30) {
        return {
            bg: "bg-yellow-50 dark:bg-yellow-950/40",
            text: "text-yellow-700 dark:text-yellow-400",
            badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
            label: "Mild",
        };
    }
    if (days <= 60) {
        return {
            bg: "bg-orange-50 dark:bg-orange-950/40",
            text: "text-orange-700 dark:text-orange-400",
            badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
            label: "Moderate",
        };
    }
    return {
        bg: "bg-red-50 dark:bg-red-950/40",
        text: "text-red-700 dark:text-red-400",
        badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        label: "Critical",
    };
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(value);
}

export function PaymentReminder({
    partyName,
    invoiceNumber,
    invoiceDate,
    totalAmount,
    balanceDue,
    status,
}: PaymentReminderProps) {
    const [copied, setCopied] = useState(false);
    const [open, setOpen] = useState(false);

    if (status === "PAID") return null;

    const daysOverdue = getDaysOverdue(invoiceDate);
    const overdueColor = getOverdueColor(daysOverdue);

    const formattedDate = new Date(invoiceDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    const reminderText = `Dear ${partyName}, this is a reminder for Invoice ${invoiceNumber} dated ${formattedDate} for ${formatCurrency(balanceDue)}. Payment is overdue by ${daysOverdue} days. Please arrange payment at earliest. - Shri Shakthi Industries`;

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(reminderText);
            setCopied(true);
            toast.success("Reminder copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy to clipboard");
        }
    }

    return (
        <>
            {/* Overdue Badge - shown inline */}
            {daysOverdue > 0 && (
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${overdueColor.badge}`}>
                    <Clock className="h-3 w-3" />
                    {daysOverdue} days overdue
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Send Reminder
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-green-600" />
                            WhatsApp Payment Reminder
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Overdue Summary */}
                        <div className={`rounded-lg p-4 ${overdueColor.bg}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Days Overdue</p>
                                    <p className={`text-3xl font-bold ${overdueColor.text}`}>
                                        {daysOverdue}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-muted-foreground">Balance Due</p>
                                    <p className={`text-xl font-bold ${overdueColor.text}`}>
                                        {formatCurrency(balanceDue)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${overdueColor.badge}`}>
                                    {overdueColor.label} Overdue
                                </span>
                            </div>
                        </div>

                        {/* Reminder Text */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Message Preview</label>
                            <div className="rounded-lg border bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                                {reminderText}
                            </div>
                        </div>

                        {/* Copy Button */}
                        <Button onClick={handleCopy} className="w-full gap-2" variant={copied ? "outline" : "default"}>
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4 text-green-600" />
                                    Copied! Paste in WhatsApp
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4" />
                                    Copy to Clipboard
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                            Copy this message and send it via WhatsApp to the party
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
