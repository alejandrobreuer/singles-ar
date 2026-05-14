"use client";

import * as React from "react";
import { useExploreNavigation } from "./ExploreTransitionProvider";
import { cn } from "@/lib/utils";

export function ExploreGridShell({ children }: { children: React.ReactNode }) {
  const { isPending } = useExploreNavigation();
  return (
    <div className={cn("flex-1 min-w-0 transition-opacity duration-200", isPending && "opacity-50 pointer-events-none")}>
      {children}
    </div>
  );
}
