"use client";

import { usePathname } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";

const HIDDEN_PREFIXES = ["/admin", "/login", "/register", "/accept-terms", "/onboarding"];

export function TopbarGuard() {
  const pathname = usePathname();
  const hidden = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (hidden) return null;
  return <Topbar />;
}
