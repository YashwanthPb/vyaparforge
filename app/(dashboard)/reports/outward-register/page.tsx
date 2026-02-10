import type { Metadata } from "next";
import { getOutwardRegister, getDivisions } from "../actions";
import { OutwardRegisterClient } from "./outward-register-client";

export const metadata: Metadata = {
  title: "Delivery Challan Register | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function OutwardRegisterPage() {
  const [data, divisions] = await Promise.all([
    getOutwardRegister({}),
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
          Delivery Challan Register
        </h2>
        <p className="text-muted-foreground">
          Complete register of all delivery challans — fabricated parts
          dispatched to HAL.
        </p>
      </div>
      <OutwardRegisterClient initialData={rows} divisions={divisions} />
    </div>
  );
}
