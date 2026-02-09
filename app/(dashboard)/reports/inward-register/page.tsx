import type { Metadata } from "next";
import { getInwardRegister, getDivisions } from "../actions";
import { InwardRegisterClient } from "./inward-register-client";

export const metadata: Metadata = {
  title: "Inward Gate Pass Register | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function InwardRegisterPage() {
  const [data, divisions] = await Promise.all([
    getInwardRegister({}),
    getDivisions(),
  ]);

  const rows = data.map((gp) => ({
    id: gp.id,
    gpNumber: gp.gpNumber,
    date: gp.date.toISOString(),
    poNumber: gp.purchaseOrder.poNumber,
    division: gp.purchaseOrder.division.name,
    partNumber: gp.poLineItem.partNumber,
    partName: gp.poLineItem.partName,
    batchNumber: gp.batchNumber ?? "",
    qty: Number(gp.qty),
    vehicleNumber: gp.vehicleNumber ?? "",
    challanNumber: gp.challanNumber ?? "",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Inward Gate Pass Register
        </h2>
        <p className="text-muted-foreground">
          Complete register of all inward gate passes — material received from
          HAL.
        </p>
      </div>
      <InwardRegisterClient initialData={rows} divisions={divisions} />
    </div>
  );
}
