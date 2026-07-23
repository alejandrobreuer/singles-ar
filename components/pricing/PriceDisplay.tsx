import { cn } from "@/lib/utils";
import { formatARS, formatPercent } from "@/lib/formatting";
import type { DiscountType } from "@/types/database";

interface PriceDisplayProps {
  price:          number | null;
  originalPrice?: number | null;
  discountType?:  DiscountType | null;
  discountValue?: number | null;
  size?:          "sm" | "md" | "lg" | "xl";
  className?:     string;
}

const SIZE_CLASS: Record<NonNullable<PriceDisplayProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl",
};

export function PriceDisplay({
  price, originalPrice, discountType, discountValue, size = "md", className,
}: PriceDisplayProps) {
  if (price == null) {
    return <span className={cn("text-text-muted font-sans text-sm", className)}>—</span>;
  }

  const isDiscounted = originalPrice != null && discountType != null && originalPrice > price;
  if (!isDiscounted) {
    return (
      <span className={cn("font-price text-text-primary", SIZE_CLASS[size], className)}>
        {formatARS(price)}
      </span>
    );
  }

  const badge = discountType === "percentage"
    ? formatPercent(-Math.abs(discountValue ?? 0), 0)
    : `-${formatARS(discountValue ?? 0)}`;

  return (
    <span className={cn("inline-flex items-baseline gap-1.5 flex-wrap", className)}>
      <span className="text-2xs text-text-muted font-sans line-through">{formatARS(originalPrice)}</span>
      <span className={cn("font-price text-success", SIZE_CLASS[size])}>{formatARS(price)}</span>
      <span className="text-2xs font-semibold font-sans text-success bg-success/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
        {badge}
      </span>
    </span>
  );
}
