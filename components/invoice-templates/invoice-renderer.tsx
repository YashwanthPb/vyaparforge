"use client";

import { type InvoiceTheme, type InvoiceData } from "./types";
import { ClassicInvoice } from "./classic-invoice";
import { ModernInvoice } from "./modern-invoice";
import { DefenseTemplate } from "./defense-invoice";

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
    case "defense":
      return <DefenseTemplate data={data} />;
    default:
      return <ClassicInvoice data={data} />;
  }
}
