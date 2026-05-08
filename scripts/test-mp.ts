import * as dotenv from "dotenv";
import * as path   from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const token = process.env.MP_ACCESS_TOKEN;

if (!token) {
  console.error("MP_ACCESS_TOKEN not found in .env.local");
  process.exit(1);
}

async function main() {
  const res  = await fetch("https://api.mercadopago.com/users/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();

  console.log("Status:", res.status);
  console.log(JSON.stringify(json, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
