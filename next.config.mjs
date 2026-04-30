/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Scryfall (Magic: The Gathering)
      { protocol: "https", hostname: "cards.scryfall.io" },
      { protocol: "https", hostname: "c1.scryfall.com" },
      // Pokémon TCG API
      { protocol: "https", hostname: "images.pokemontcg.io" },
      // One Piece TCG
      { protocol: "https", hostname: "en.onepiece-cardgame.com" },
      // Supabase Storage (user uploads)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Allow large Scryfall bulk-data downloads in API routes (default is 4MB)
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
};

export default nextConfig;
