import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

// ─── Platform-level client ────────────────────────────────────────────────────
// Uses the marketplace account's access token.
// Used for: querying payments, webhook processing.

const platformConfig = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export const mpPayment    = new Payment(platformConfig);
export const mpPreference = new Preference(platformConfig);

// ─── Per-seller preference client ────────────────────────────────────────────
// Preferences must be created with the SELLER's access token so that
// MercadoPago routes the payment to their account minus marketplace_fee.

export function createSellerPreference(sellerAccessToken: string): Preference {
  const config = new MercadoPagoConfig({ accessToken: sellerAccessToken });
  return new Preference(config);
}
