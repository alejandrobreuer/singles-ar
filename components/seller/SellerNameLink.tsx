"use client";

import { cn } from "@/lib/utils";
import { fantasyName } from "@/lib/fantasy-name";
import { useOpenSellerDrawer } from "@/hooks/useSellerDrawer";

interface SellerNameLinkProps {
  listingId: string;
  sellerId:  string;
  className?: string;
}

/**
 * Renders this listing's auto-generated alias. Clicking it opens the
 * seller inventory drawer (via seller_id) without exposing the seller's
 * real identity or changing the URL.
 */
export function SellerNameLink({ listingId, sellerId, className }: SellerNameLinkProps) {
  const openDrawer = useOpenSellerDrawer();

  return (
    <span
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void openDrawer(sellerId);
      }}
      title="Ver más listings de este vendedor"
      className={cn("cursor-pointer hover:underline underline-offset-2", className)}
    >
      {fantasyName(listingId)}
    </span>
  );
}
