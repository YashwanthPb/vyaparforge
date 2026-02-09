import type { Metadata } from "next";
import { getInwardGatePasses } from "./actions";
import { GPTable } from "./gp-table";

export const metadata: Metadata = {
  title: "Inward Gate Passes | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function InwardGatePassesPage() {
  const gatePasses = await getInwardGatePasses();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Inward Gate Passes
        </h2>
        <p className="text-muted-foreground">
          Track raw materials received from HAL.
        </p>
      </div>

      <GPTable gatePasses={gatePasses} />
    </div>
  );
}
