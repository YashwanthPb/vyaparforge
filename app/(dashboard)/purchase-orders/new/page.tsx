import type { Metadata } from "next";
import { getDivisions } from "../actions";
import { POForm } from "./po-form";

export const metadata: Metadata = {
  title: "New Purchase Order | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  const divisions = await getDivisions();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Create Purchase Order
        </h2>
        <p className="text-muted-foreground">
          Add a new purchase order from HAL.
        </p>
      </div>
      <POForm divisions={divisions} />
    </div>
  );
}
