import type { Metadata } from "next";
import { getOutwardGatePasses } from "./actions";
import { OGPTable } from "./ogp-table";

export const metadata: Metadata = {
  title: "Outward Gate Passes | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function OutwardGatePassesPage() {
  const gatePasses = await getOutwardGatePasses();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Outward Gate Passes
        </h2>
        <p className="text-muted-foreground">
          Track fabricated parts dispatched to HAL.
        </p>
      </div>

      <OGPTable gatePasses={gatePasses} />
    </div>
  );
}
