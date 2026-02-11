import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getOutwardGatePass } from "../actions";
import { DCPreview } from "./dc-preview";
import {
  DEFAULT_SELLER,
  DEFAULT_BUYER,
} from "@/components/invoice-templates/types";
import type { DCData } from "@/components/invoice-templates/types";

export const dynamic = "force-dynamic";

export default async function DCDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dc = await getOutwardGatePass(id);

  if (!dc) {
    notFound();
  }

  const dcData: DCData = {
    dcNumber: dc.gpNumber,
    date: format(new Date(dc.date), "dd-MM-yyyy"),
    poReference: dc.poNumber,
    vehicleNumber: dc.vehicleNumber || "",
    transportDetails: "By Road",
    seller: DEFAULT_SELLER,
    buyer: {
      ...DEFAULT_BUYER,
      division: dc.divisionName,
    },
    items: [
      {
        sno: 1,
        partNumber: dc.partNumber,
        description: dc.partName,
        workOrder: dc.workOrder,
        qty: dc.qty,
        unit: dc.unit,
      },
    ],
    remarks: dc.remarks || null,
  };

  return (
    <div className="space-y-6">
      {/* Screen-only header */}
      <div className="flex items-start justify-between print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/outward-gate-passes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <h2 className="text-2xl font-bold tracking-tight">
              {dc.gpNumber}
            </h2>
          </div>
          <p className="text-muted-foreground mt-1 ml-11">
            PO: {dc.poNumber} — {dc.divisionName}
          </p>
        </div>
      </div>

      {/* Themed DC Preview */}
      <DCPreview data={dcData} />
    </div>
  );
}
