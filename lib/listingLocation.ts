import type { Listing, ListingLocationWithNames } from "@/types/database";

export function locationItemLabel(loc: ListingLocationWithNames): string | null {
  if (loc.stores)    return `🏪 ${loc.stores.name}`;
  if (loc.areas)     return `📍 ${loc.areas.name}, ${loc.provinces?.name ?? ""}`;
  if (loc.zones)     return `📍 ${loc.zones.name}, ${loc.provinces?.name ?? ""}`;
  if (loc.provinces) return `📍 ${loc.provinces.name}`;
  return null;
}

export function listingLocationLabels(listing: Pick<Listing, "listing_locations">): string[] {
  return (listing.listing_locations ?? [])
    .map(locationItemLabel)
    .filter((l): l is string => !!l);
}

/** First location label, with "+N" suffix if there are more. */
export function listingLocationSummary(listing: Pick<Listing, "listing_locations">): string | null {
  const labels = listingLocationLabels(listing);
  if (labels.length === 0) return null;
  if (labels.length === 1) return labels[0];
  return `${labels[0]} +${labels.length - 1}`;
}
