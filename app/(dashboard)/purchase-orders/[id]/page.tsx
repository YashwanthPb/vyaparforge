import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Package, ArrowDownToLine, ArrowUpFromLine, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { getPurchaseOrder } from "../actions";
import { RecordGatePassButton } from "./record-gate-pass-button";
import { RecordDispatchButton } from "./record-dispatch-button";

export const dynamic = "force-dynamic";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  PARTIALLY_FULFILLED: {
    label: "Partially Fulfilled",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
  COMPLETED: {
    label: "Completed",
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

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const po = await getPurchaseOrder(id);

  if (!po) {
    notFound();
  }

  const totalOrdered = po.lineItems.reduce(
    (sum, item) => sum + Number(item.qtyOrdered),
    0
  );
  const totalReceived = po.lineItems.reduce(
    (sum, item) => sum + Number(item.qtyReceived),
    0
  );
  const totalDispatched = po.lineItems.reduce(
    (sum, item) => sum + Number(item.qtyDispatched),
    0
  );
  const totalBalance = totalOrdered - totalDispatched;

  const status = statusConfig[po.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">
              {po.poNumber}
            </h2>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {po.division.name}
          </p>
        </div>
      </div>

      {/* PO Info */}
      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
        <span>
          PO Date: <span className="text-foreground font-medium">{format(new Date(po.date), "dd-MM-yyyy")}</span>
        </span>
        {po.deliveryDate && (
          <span>
            Delivery Date: <span className="text-foreground font-medium">{format(new Date(po.deliveryDate), "dd-MM-yyyy")}</span>
          </span>
        )}
        {po.remarks && (
          <span>
            Remarks: <span className="text-foreground font-medium">{po.remarks}</span>
          </span>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Ordered</CardTitle>
            <Package className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrdered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <ArrowDownToLine className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalReceived}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Dispatched</CardTitle>
            <ArrowUpFromLine className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalDispatched}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Scale className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalBalance}</div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle>PO Ledger</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part Number</TableHead>
                <TableHead>Part Name</TableHead>
                <TableHead>Work Order</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Dispatched</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-[140px]">Progress</TableHead>
                <TableHead className="text-right">Rate (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.lineItems.map((item) => {
                const ordered = Number(item.qtyOrdered);
                const received = Number(item.qtyReceived);
                const dispatched = Number(item.qtyDispatched);
                const balance = ordered - dispatched;
                const receivedPct = ordered > 0 ? (received / ordered) * 100 : 0;
                const dispatchedPct = ordered > 0 ? (dispatched / ordered) * 100 : 0;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.partNumber}
                    </TableCell>
                    <TableCell>{item.partName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.workOrder || "—"}
                    </TableCell>
                    <TableCell className="text-right">{ordered}</TableCell>
                    <TableCell className="text-right">{received}</TableCell>
                    <TableCell className="text-right">{dispatched}</TableCell>
                    <TableCell className="text-right font-medium">
                      {balance}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{ width: `${Math.min(receivedPct, 100)}%` }}
                          />
                        </div>
                        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all"
                            style={{ width: `${Math.min(dispatchedPct, 100)}%` }}
                          />
                        </div>
                        <div className="text-muted-foreground flex justify-between text-[10px]">
                          <span className="text-blue-600">{receivedPct.toFixed(0)}% rcvd</span>
                          <span className="text-green-600">{dispatchedPct.toFixed(0)}% disp</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(item.rate))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inward Gate Passes Section */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Inward Gate Passes</CardTitle>
          <div className="flex items-center gap-2">
          <RecordGatePassButton
            po={{
              id: po.id,
              poNumber: po.poNumber,
              date: po.date,
              deliveryDate: po.deliveryDate,
              remarks: po.remarks,
              divisionName: po.division.name,
              lineItems: po.lineItems.map((item) => ({
                id: item.id,
                partNumber: item.partNumber,
                partName: item.partName,
                workOrder: item.workOrder,
                qtyOrdered: Number(item.qtyOrdered),
                qtyReceived: Number(item.qtyReceived),
                balance: Number(item.qtyOrdered) - Number(item.qtyReceived),
              })),
            }}
          />
          <RecordDispatchButton
            po={{
              id: po.id,
              poNumber: po.poNumber,
              date: po.date,
              deliveryDate: po.deliveryDate,
              remarks: po.remarks,
              divisionName: po.division.name,
              lineItems: po.lineItems.map((item) => ({
                id: item.id,
                partNumber: item.partNumber,
                partName: item.partName,
                workOrder: item.workOrder,
                qtyOrdered: Number(item.qtyOrdered),
                qtyReceived: Number(item.qtyReceived),
                qtyDispatched: Number(item.qtyDispatched),
                dispatchBalance:
                  Number(item.qtyReceived) - Number(item.qtyDispatched),
              })),
            }}
          />
          </div>
        </CardHeader>
        <CardContent>
          {po.inwardGatePasses.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No gate passes yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GP Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Challan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.inwardGatePasses.map((gp) => (
                  <TableRow key={gp.id}>
                    <TableCell className="font-medium">
                      {gp.gpNumber}
                    </TableCell>
                    <TableCell>
                      {format(new Date(gp.date), "dd-MM-yyyy")}
                    </TableCell>
                    <TableCell>
                      {gp.poLineItem.partNumber} — {gp.poLineItem.partName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {gp.batchNumber || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(gp.qty)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {gp.vehicleNumber || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {gp.challanNumber || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outward Gate Passes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Outward Gate Passes</CardTitle>
        </CardHeader>
        <CardContent>
          {po.outwardGatePasses.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No dispatches yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GP Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Challan</TableHead>
                  <TableHead>Dispatch Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.outwardGatePasses.map((gp) => (
                  <TableRow key={gp.id}>
                    <TableCell className="font-medium">
                      {gp.gpNumber}
                    </TableCell>
                    <TableCell>
                      {format(new Date(gp.date), "dd-MM-yyyy")}
                    </TableCell>
                    <TableCell>
                      {gp.poLineItem.partNumber} — {gp.poLineItem.partName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {gp.batchNumber || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(gp.qty)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {gp.vehicleNumber || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {gp.challanNumber || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {gp.dispatchDate
                        ? format(new Date(gp.dispatchDate), "dd-MM-yyyy")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
