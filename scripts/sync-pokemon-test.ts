import { config } from "dotenv";
config({ path: ".env.local" });
import { fetchAndSyncTCGdex } from "../lib/sync/tcgdex";

// Sync just the original Base Set (base1) — 102 cards, good smoke test
fetchAndSyncTCGdex({ setIds: ["base1"] })
  .then((result) => {
    console.log("\nResult:", JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
