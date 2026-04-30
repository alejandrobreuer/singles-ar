// ─── Auth utilities ───────────────────────────────────────────────────────────

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Generate a usr_xxxxxxxx internal identifier */
export function generateInternalId(): string {
  const random = Array.from({ length: 8 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
  return `usr_${random}`;
}

/** Username validation rules */
export const USERNAME_RULES = {
  minLength: 3,
  maxLength: 20,
  pattern:   /^[a-zA-Z0-9_]+$/,
};

export function validateUsername(value: string): string | null {
  if (value.length < USERNAME_RULES.minLength)
    return `El apodo debe tener al menos ${USERNAME_RULES.minLength} caracteres.`;
  if (value.length > USERNAME_RULES.maxLength)
    return `El apodo no puede superar los ${USERNAME_RULES.maxLength} caracteres.`;
  if (!USERNAME_RULES.pattern.test(value))
    return "Solo se permiten letras, números y guiones bajos (_).";
  return null;
}

/** Build the MercadoPago OAuth authorization URL */
export function buildMPAuthUrl(): string {
  const base    = "https://auth.mercadopago.com/authorization";
  const params  = new URLSearchParams({
    client_id:    process.env.NEXT_PUBLIC_MP_CLIENT_ID ?? process.env.MP_CLIENT_ID ?? "",
    response_type: "code",
    platform_id:   "mp",
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/mercadopago-callback`,
  });
  return `${base}?${params.toString()}`;
}
