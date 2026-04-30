"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CreditCard, Layers, Users, Settings, ArrowLeft, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin",              label: "Dashboard",       icon: <LayoutDashboard size={16} />, exact: true  },
  { href: "/admin/cards",        label: "Cartas",          icon: <Layers          size={16} />, exact: false },
  { href: "/admin/transactions", label: "Transacciones",   icon: <CreditCard      size={16} />, exact: false },
  { href: "/admin/users",        label: "Usuarios",        icon: <Users           size={16} />, exact: false },
  { href: "/admin/settings",     label: "Configuración",   icon: <Settings        size={16} />, exact: false },
];

interface AdminSidebarProps {
  username: string;
}

export function AdminSidebar({ username }: AdminSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-white">
            <Zap size={14} />
          </div>
          <span className="font-serif font-semibold text-text-primary">Admin</span>
        </div>
        <p className="text-2xs text-text-muted font-sans truncate">@{username}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium font-sans transition-colors no-underline",
              isActive(item.href, item.exact)
                ? "bg-primary/10 text-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-secondary"
            )}
          >
            <span className={isActive(item.href, item.exact) ? "text-primary" : "text-text-muted"}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Back to app */}
      <div className="px-3 py-3 border-t border-border">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-sans text-text-muted hover:text-text-primary hover:bg-secondary transition-colors no-underline"
        >
          <ArrowLeft size={14} />
          Volver al app
        </Link>
      </div>
    </aside>
  );
}
