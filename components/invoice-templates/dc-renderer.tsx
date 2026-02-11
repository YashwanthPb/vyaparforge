"use client";

import { type DCTheme, type DCData } from "./types";
import { ClassicDC } from "./classic-dc";
import { ModernDC } from "./modern-dc";

interface DCRendererProps {
  data: DCData;
  theme: DCTheme;
}

export function DCRenderer({ data, theme }: DCRendererProps) {
  switch (theme) {
    case "classic":
      return <ClassicDC data={data} />;
    case "modern":
      return <ModernDC data={data} />;
    default:
      return <ClassicDC data={data} />;
  }
}
