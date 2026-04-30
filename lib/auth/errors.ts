// ─── Spanish error messages for Supabase Auth errors ─────────────────────────

const ERROR_MAP: Record<string, string> = {
  // Credentials
  "Invalid login credentials":
    "El correo o la contraseña son incorrectos.",
  "Email not confirmed":
    "Necesitás confirmar tu correo antes de iniciar sesión. Revisá tu bandeja de entrada.",
  "User already registered":
    "Ya existe una cuenta con ese correo. ¿Querés iniciar sesión?",
  "Password should be at least 6 characters":
    "La contraseña debe tener al menos 6 caracteres.",
  "Signup requires a valid password":
    "La contraseña ingresada no es válida.",
  // Rate limits
  "Email rate limit exceeded":
    "Demasiados intentos. Esperá unos minutos y volvé a intentarlo.",
  "For security purposes, you can only request this once every 60 seconds":
    "Por seguridad, esperá 60 segundos antes de volver a intentarlo.",
  // Network / misc
  "Failed to fetch":
    "Sin conexión. Verificá tu internet y volvé a intentarlo.",
  "NetworkError when attempting to fetch resource":
    "Sin conexión. Verificá tu internet y volvé a intentarlo.",
};

export function mapAuthError(raw: unknown): string {
  const msg =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
      ? raw
      : "Error desconocido.";

  for (const [key, translation] of Object.entries(ERROR_MAP)) {
    if (msg.includes(key)) return translation;
  }

  return "Ocurrió un error inesperado. Por favor, intentá de nuevo.";
}
