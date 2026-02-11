"use client";

import { type InvoiceTheme, type InvoiceData } from "./types";
import { ClassicInvoice } from "./classic-invoice";
import { ModernInvoice } from "./modern-invoice";
import { MinimalInvoice } from "./minimal-invoice";

interface InvoiceRendererProps {
  data: InvoiceData;
  theme: InvoiceTheme;
}

export function InvoiceRenderer({ data, theme }: InvoiceRendererProps) {
  switch (theme) {
    case "classic":
      return <ClassicInvoice data={data} />;
    case "modern":
      return <ModernInvoice data={data} />;
    case "minimal":
      return <MinimalInvoice data={data} />;
    default:
      return <ClassicInvoice data={data} />;
  }
}
