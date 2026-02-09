import type { Metadata } from "next";
import { getInvoiceRegister, getDivisions } from "../actions";
import { InvoiceRegisterClient } from "./invoice-register-client";

export const metadata: Metadata = {
  title: "Invoice Register | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function InvoiceRegisterPage() {
  const [data, divisions] = await Promise.all([
    getInvoiceRegister({}),
    getDivisions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Invoice Register</h2>
        <p className="text-muted-foreground">
          All invoices with GST breakup, payment status, and outstanding
          amounts.
        </p>
      </div>
      <InvoiceRegisterClient initialData={data} divisions={divisions} />
    </div>
  );
}
