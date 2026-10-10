"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function FieldHint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger type="button" className="field-hint" aria-label={label}>
        <Info aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="top" align="start" sideOffset={10} className="field-hint-popup">
        <div className="flex flex-col gap-2">{children}</div>
      </TooltipContent>
    </Tooltip>
  );
}
