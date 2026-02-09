import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardList,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  Building2,
  IndianRupee,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Reports | VyaparForge",
};

const reportCards = [
  {
    title: "PO Balance Report",
    description:
      "View ordered, received, dispatched & balance quantities across all POs with value analysis.",
    href: "/reports/po-balance",
    icon: ClipboardList,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950",
  },
  {
    title: "Inward Gate Pass Register",
    description:
      "Complete register of all inward gate passes — material received from HAL.",
    href: "/reports/inward-register",
    icon: ArrowDownToLine,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950",
  },
  {
    title: "Outward Gate Pass Register",
    description:
      "Complete register of all outward gate passes — fabricated parts dispatched to HAL.",
    href: "/reports/outward-register",
    icon: ArrowUpFromLine,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950",
  },
  {
    title: "Invoice Register",
    description:
      "All invoices with GST breakup, payment status, and outstanding amounts.",
    href: "/reports/invoice-register",
    icon: Receipt,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950",
  },
  {
    title: "Division-wise Summary",
    description:
      "Consolidated summary per HAL division — POs, orders, dispatches, invoicing & payments.",
    href: "/reports/division-summary",
    icon: Building2,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950",
  },
  {
    title: "Outstanding Payments",
    description:
      "Track unpaid and partially paid invoices sorted by days overdue.",
    href: "/reports/outstanding",
    icon: IndianRupee,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">
          Generate, view & export reports for your manufacturing operations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="h-full transition-colors hover:border-primary/50 hover:shadow-md">
              <CardHeader>
                <div
                  className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${card.bg}`}
                >
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <CardTitle className="text-base">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
