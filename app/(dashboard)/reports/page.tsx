import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardList,
  ArrowDownToLine,
  FileOutput,
  Receipt,
  Building2,
  IndianRupee,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  FileSpreadsheet,
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

type ReportCard = {
  title: string;
  description: string;
  href: string;
  icon: typeof ClipboardList;
  color: string;
  bg: string;
};

const reportCategories: {
  category: string;
  description: string;
  cards: ReportCard[];
}[] = [
    {
      category: "Operations",
      description: "Track purchase orders, gate passes, and dispatch",
      cards: [
        {
          title: "PO Balance Report",
          description: "Ordered, received, dispatched & balance with value analysis.",
          href: "/reports/po-balance",
          icon: ClipboardList,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-950",
        },
        {
          title: "Inward Gate Pass Register",
          description: "All materials received from HAL.",
          href: "/reports/inward-register",
          icon: ArrowDownToLine,
          color: "text-green-600 dark:text-green-400",
          bg: "bg-green-50 dark:bg-green-950",
        },
        {
          title: "Delivery Challan Register",
          description: "All fabricated parts dispatched to HAL.",
          href: "/reports/outward-register",
          icon: FileOutput,
          color: "text-orange-600 dark:text-orange-400",
          bg: "bg-orange-50 dark:bg-orange-950",
        },
        {
          title: "Division-wise Summary",
          description: "Consolidated per HAL division — POs, dispatches, invoicing & payments.",
          href: "/reports/division-summary",
          icon: Building2,
          color: "text-teal-600 dark:text-teal-400",
          bg: "bg-teal-50 dark:bg-teal-950",
        },
      ],
    },
    {
      category: "Sales & Invoicing",
      description: "Invoice registers, GST filing, and revenue tracking",
      cards: [
        {
          title: "Invoice Register",
          description: "All invoices with GST breakup, payment status & outstanding.",
          href: "/reports/invoice-register",
          icon: Receipt,
          color: "text-purple-600 dark:text-purple-400",
          bg: "bg-purple-50 dark:bg-purple-950",
        },
        {
          title: "GSTR-1 Export",
          description: "Export invoices for GST filing — B2B, B2CS, HSN summary.",
          href: "/reports/gstr1",
          icon: FileSpreadsheet,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-950",
        },
      ],
    },
    {
      category: "Receivables",
      description: "Track what customers owe and aging analysis",
      cards: [
        {
          title: "Outstanding Receivables",
          description: "Unpaid sale invoices sorted by oldest.",
          href: "/reports/outstanding-receivables",
          icon: TrendingUp,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-950",
        },
        {
          title: "Receivables Aging",
          description: "Grouped by party — 0-30, 31-60, 61-90, 90+ day buckets.",
          href: "/reports/aging-receivables",
          icon: Clock,
          color: "text-cyan-600 dark:text-cyan-400",
          bg: "bg-cyan-50 dark:bg-cyan-950",
        },
      ],
    },
    {
      category: "Payables",
      description: "Track what you owe suppliers and aging analysis",
      cards: [
        {
          title: "Outstanding Payables",
          description: "Unpaid purchase invoices sorted by oldest.",
          href: "/reports/outstanding-payables",
          icon: TrendingDown,
          color: "text-orange-600 dark:text-orange-400",
          bg: "bg-orange-50 dark:bg-orange-950",
        },
        {
          title: "Payables Aging",
          description: "Grouped by supplier — 0-30, 31-60, 61-90, 90+ day buckets.",
          href: "/reports/aging-payables",
          icon: Clock,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-950",
        },
      ],
    },
    {
      category: "Party Management",
      description: "Party-wise transaction ledgers and outstanding summaries",
      cards: [
        {
          title: "Party Ledger",
          description: "All transactions per party — sales, purchases, and running balance.",
          href: "/reports/party-ledger",
          icon: Users,
          color: "text-indigo-600 dark:text-indigo-400",
          bg: "bg-indigo-50 dark:bg-indigo-950",
        },
        {
          title: "Outstanding Payments",
          description: "All unpaid and partially paid invoices by days overdue.",
          href: "/reports/outstanding",
          icon: IndianRupee,
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-50 dark:bg-red-950",
        },
      ],
    },
  ];

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="text-muted-foreground">
          Generate, view & export reports for your manufacturing operations.
        </p>
      </div>

      {reportCategories.map((group) => (
        <div key={group.category} className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold">{group.category}</h3>
            <p className="text-sm text-muted-foreground">
              {group.description}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.cards.map((card) => (
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
      ))}
    </div>
  );
}
