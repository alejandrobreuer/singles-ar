"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ChevronDown, LogOut, User, Package, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { NotificationBell } from "@/components/layout/NotificationBell";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavLink {
  href:  string;
  label: string;
}

interface TopbarUser {
  id:        string;
  name:      string;
  email:     string;
  avatarUrl?: string;
}

export interface TopbarProps {}

// ─── Nav links ────────────────────────────────────────────────────────────────

const NAV_LINKS: NavLink[] = [
  { href: "/",       label: "Inicio"       },
  { href: "/cards",  label: "Explorar"     },
  { href: "/sell",   label: "Vender"       },
  { href: "/chat",   label: "Mis chats"    },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center no-underline group"
      aria-label="Singles.ar — Inicio"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo.png"
        alt="Singles.ar"
        className="h-8 w-auto object-contain"
      />
    </Link>
  );
}

// ─── Nav link ─────────────────────────────────────────────────────────────────

function NavItem({ href, label }: NavLink) {
  const pathname = usePathname();
  const active   = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "relative text-sm font-medium font-sans transition-colors duration-150 no-underline",
        "after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:rounded-full after:bg-accent",
        "after:transition-all after:duration-200",
        active
          ? "text-primary after:w-full"
          : "text-text-secondary hover:text-text-primary after:w-0 hover:after:w-full"
      )}
    >
      {label}
    </Link>
  );
}

// ─── User dropdown ────────────────────────────────────────────────────────────

interface UserMenuProps {
  user:      TopbarUser;
  isAdmin?:  boolean;
  onLogout?: () => void;
}

function UserMenu({ user, isAdmin, onLogout }: UserMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref             = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return ()  => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handler);
    return ()  => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5",
          "text-text-secondary hover:text-text-primary hover:bg-primary/5",
          "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-primary/30 focus-visible:ring-offset-1"
        )}
      >
        <Avatar
          src={user.avatarUrl}
          name={user.name}
          size="sm"
        />
        <span className="hidden sm:block text-sm font-medium font-sans max-w-[120px] truncate">
          {user.name.split(" ")[0]}
        </span>
        <ChevronDown
          size={14}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full mt-2 w-56 z-50",
            "bg-surface rounded-xl border border-border shadow-card-lg",
            "animate-fade-in py-1.5"
          )}
        >
          {/* User info header */}
          <div className="px-4 py-3">
            <p className="text-sm font-semibold font-sans text-text-primary truncate">
              {user.name}
            </p>
            <p className="text-xs text-text-muted font-sans truncate">{user.email}</p>
          </div>

          <Divider className="my-1" />

          <DropdownItem href="/profile"  icon={<User size={14} />}    label="Mi cuenta"    onClick={() => setOpen(false)} />
          <DropdownItem href="/sell"     icon={<Package size={14} />} label="Vender carta" onClick={() => setOpen(false)} />
          {isAdmin && (
            <DropdownItem href="/admin" icon={<ShieldCheck size={14} />} label="Panel de Admin" onClick={() => setOpen(false)} />
          )}

          <Divider className="my-1" />

          <button
            role="menuitem"
            onClick={() => { setOpen(false); onLogout?.(); }}
            className={cn(
              "flex w-full items-center gap-2.5 px-4 py-2 text-sm font-sans",
              "text-error hover:bg-error-subtle transition-colors duration-100"
            )}
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  href:    string;
  icon:    React.ReactNode;
  label:   string;
  onClick?: () => void;
}

function DropdownItem({ href, icon, label, onClick }: DropdownItemProps) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-4 py-2 text-sm font-sans no-underline",
        "text-text-secondary hover:text-text-primary hover:bg-primary/5 transition-colors duration-100"
      )}
    >
      <span className="text-text-muted">{icon}</span>
      {label}
    </Link>
  );
}

// ─── Mobile menu ─────────────────────────────────────────────────────────────

interface MobileMenuProps {
  open:      boolean;
  user?:     TopbarUser | null;
  onClose:   () => void;
  onLogout?: () => void;
}

function MobileMenu({ open, user, onClose, onLogout }: MobileMenuProps) {
  if (!open) return null;

  return (
    <div className="md:hidden border-t border-border bg-surface animate-fade-in">
      <nav className="px-4 py-3 flex flex-col gap-1">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="block px-3 py-2.5 rounded-lg text-sm font-medium font-sans text-text-secondary hover:text-text-primary hover:bg-primary/5 transition-colors no-underline"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <Divider className="mx-4" />

      <div className="px-4 py-3">
        {user ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-3 py-2">
              <Avatar src={user.avatarUrl} name={user.name} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-semibold font-sans text-text-primary truncate">{user.name}</p>
                <p className="text-xs text-text-muted font-sans truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<LogOut size={14} />}
              className="w-full justify-start text-error hover:bg-error-subtle hover:text-error"
              onClick={() => { onClose(); onLogout?.(); }}
            >
              Cerrar sesión
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button variant="ghost"   size="md" className="w-full" asChild>
              <Link href="/login" onClick={onClose}>Iniciar sesión</Link>
            </Button>
            <Button variant="primary" size="md" className="w-full" asChild>
              <Link href="/register" onClick={onClose}>Registrarse</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export function Topbar(_props: TopbarProps) {
  const router                      = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [user,       setUser]       = React.useState<TopbarUser | null>(null);
  const [isAdmin,    setIsAdmin]    = React.useState(false);

  React.useEffect(() => {
    const supabase = createClient();

    async function loadUser(userId: string, email: string) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", userId)
        .single();
      setUser({
        id:        userId,
        name:      profile?.username ?? email.split("@")[0],
        email,
        avatarUrl: profile?.avatar_url ?? undefined,
      });
      fetch("/api/auth/is-admin")
        .then((r) => r.json())
        .then(({ isAdmin: admin }) => setIsAdmin(!!admin))
        .catch(() => setIsAdmin(false));
    }

    // Fetch current session on mount
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) loadUser(u.id, u.email ?? "");
    });

    // Keep in sync on sign-in / sign-out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUser(session.user.id, session.user.email ?? "");
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-surface/95 backdrop-blur-sm border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-20 items-center">

          {/* Left: Logo — pinned far left */}
          <Logo />

          {/* Center: Desktop nav — truly centered in the full bar */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
            {NAV_LINKS.map((link) => (
              <NavItem key={link.href} {...link} />
            ))}
          </nav>

          {/* Right: Auth — pushed to far right */}
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell userId={user.id} />
                <UserMenu user={user} isAdmin={isAdmin} onLogout={handleLogout} />
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
                <Button variant="primary" size="sm" asChild>
                  <Link href="/register">Registrarse</Link>
                </Button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-primary/5 transition-colors"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <MobileMenu
        open={mobileOpen}
        user={user}
        onClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />
    </header>
  );
}
