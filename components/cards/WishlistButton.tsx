"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  cardId:        string;
  initialState:  boolean;   // server-resolved: is this card already in wishlist?
  isLoggedIn:    boolean;
  variant?:      "ghost" | "sidebar"; // ghost = small text button, sidebar = icon-only pill
  className?:    string;
}

export function WishlistButton({
  cardId,
  initialState,
  isLoggedIn,
  variant = "ghost",
  className,
}: WishlistButtonProps) {
  const [inWishlist, setInWishlist] = React.useState(initialState);
  const [loading,    setLoading]    = React.useState(false);

  async function toggle() {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    try {
      if (inWishlist) {
        await fetch(`/api/wishlist?cardId=${cardId}`, { method: "DELETE" });
        setInWishlist(false);
      } else {
        const res = await fetch("/api/wishlist", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ cardId }),
        });
        if (res.ok || res.status === 409) setInWishlist(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-label={inWishlist ? "Quitar de wishlist" : "Agregar a wishlist"}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium font-sans transition-colors disabled:opacity-50",
          inWishlist
            ? "bg-accent/10 border border-accent/25 text-accent hover:bg-accent/20"
            : "bg-secondary border border-border text-text-secondary hover:bg-border",
          className,
        )}
      >
        <Heart size={13} className={inWishlist ? "fill-accent" : ""} />
        {inWishlist ? "En wishlist" : "Agregar a wishlist"}
      </button>
    );
  }

  // ghost variant — used inside the "¿Querés esta carta?" panel
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium font-sans border transition-colors disabled:opacity-50",
        inWishlist
          ? "bg-accent/10 border-accent/25 text-accent hover:bg-accent/20"
          : "bg-surface border-border text-text-secondary hover:bg-secondary",
        className,
      )}
    >
      <Heart size={13} className={inWishlist ? "fill-accent" : ""} />
      {inWishlist ? "En tu wishlist" : "Agregar a wishlist"}
    </button>
  );
}
