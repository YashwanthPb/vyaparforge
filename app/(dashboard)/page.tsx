import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  PackageOpen,
  Truck,
  AlertTriangle,
  Building2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getDashboardStats, getActivePOs, getDivisionSummary, getOutstandingStats } from "./actions";

export const metadata: Metadata = {
  title: "Dashboard | VyaparForge",
};

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "OPEN"
      ? "secondary"
      : status === "PARTIALLY_FULFILLED"
        ? "outline"
        : "default";

  const label =
    status === "PARTIALLY_FULFILLED" ? "Partial" : status.charAt(0) + status.slice(1).toLowerCase();

  return <Badge variant={variant}>{label}</Badge>;
}

export default async function DashboardPage() {
  const [stats, activePOs, divisionSummary, outstanding] = await Promise.all([
    getDashboardStats(),
    getActivePOs(),
    getDivisionSummary(),
    getOutstandingStats(),
  ]);

  const statCards = [
    {
      title: "Open POs",
      value: stats.openPOs,
      icon: FileText,
      accent: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      title: "Pending Material",
      value: stats.pendingMaterial,
      icon: PackageOpen,
      accent: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/40",
    },
    {
      title: "Ready to Dispatch",
      value: stats.readyToDispatch,
      icon: Truck,
      accent: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/40",
    },
    {
      title: "Overdue",
      value: stats.overdue,
      icon: AlertTriangle,
      accent: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/40",
    },
  ];

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your manufacturing operations for HAL.
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`rounded-md p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.accent}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.accent}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Financials ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Receivables
            </CardTitle>
            <div className="rounded-md p-2 bg-blue-50 dark:bg-blue-950/40">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(outstanding.receivables)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unpaid sale invoices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Payables
            </CardTitle>
            <div className="rounded-md p-2 bg-orange-50 dark:bg-orange-950/40">
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
              {formatCurrency(outstanding.payables)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unpaid purchase invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Active POs Table ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Active Purchase Orders</CardTitle>
          <CardDescription>
            10 most recent open or partially fulfilled POs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activePOs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No active purchase orders.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead className="text-center">Line Items</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePOs.map((po) => (
                  <TableRow key={po.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/purchase-orders/${po.id}`}
                        className="font-medium hover:underline"
                      >
                        {po.poNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{po.divisionName}</TableCell>
                    <TableCell className="text-center">
                      {po.lineItemCount}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${po.fulfillmentPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">
                          {po.fulfillmentPct}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(po.deliveryDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={po.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Division Summary ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Division Summary</CardTitle>
          <CardDescription>
            Open POs and pending balance by HAL division
          </CardDescription>
        </CardHeader>
        <CardContent>
          {divisionSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No divisions configured.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {divisionSummary.map((div) => (
                <div
                  key={div.id}
                  className="flex items-start gap-3 rounded-lg border p-4"
                >
                  <div className="rounded-md bg-muted p-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {div.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {div.code}
                    </p>
                    <div className="flex gap-4 pt-1">
                      <div>
                        <span className="text-lg font-bold">{div.openPOCount}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          open POs
                        </span>
                      </div>
                      <div>
                        <span className="text-lg font-bold">{div.pendingBalance}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          pending qty
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
