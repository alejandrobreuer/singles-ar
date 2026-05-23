"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, RefreshCw, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email("Ingresá un correo válido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

type LoginFields = z.infer<typeof loginSchema>;
type FieldErrors = Partial<Record<keyof LoginFields, string>>;

// ─── Page ─────────────────────────────────────────────────────────────────────

function LoginPage() {
  const searchParams = useSearchParams();
  const nextPath     = searchParams.get("next") ?? "/";

  const urlError = searchParams.get("error");
  const urlErrorMsg = urlError === "confirmation_failed"
    ? "El enlace de confirmación expiró o no es válido. Intentá registrarte nuevamente."
    : urlError === "invalid_confirmation_link"
    ? "El enlace de confirmación es inválido. Revisá tu correo o registrate de nuevo."
    : null;

  const [fields,      setFields]      = React.useState<LoginFields>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [globalError, setGlobalError] = React.useState<string | null>(urlErrorMsg);
  const [loading,     setLoading]     = React.useState(false);
  const [showPwd,     setShowPwd]     = React.useState(false);
  const [showResend,  setShowResend]  = React.useState(urlError === "confirmation_failed" || urlError === "invalid_confirmation_link");
  const [resendState, setResendState] = React.useState<"idle" | "loading" | "sent" | "error">("idle");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof LoginFields]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setGlobalError(null);
  }

  async function handleResend() {
    if (!fields.email) {
      setFieldErrors((prev) => ({ ...prev, email: "Ingresá tu correo para reenviar la confirmación." }));
      return;
    }
    setResendState("loading");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type:  "signup",
        email: fields.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding/username`,
        },
      });
      setResendState(error ? "error" : "sent");
    } catch {
      setResendState("error");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = loginSchema.safeParse(fields);
    if (!result.success) {
      const errs: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof LoginFields;
        errs[key] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setGlobalError(null);
    setShowResend(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email:    result.data.email,
        password: result.data.password,
      });

      if (error) {
        const mapped = mapAuthError(error);
        setGlobalError(mapped);
        if (error.message.includes("Email not confirmed")) setShowResend(true);
        return;
      }

      window.location.href = nextPath;
    } catch (err) {
      setGlobalError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">
          Iniciar sesión
        </h1>
        <p className="text-sm text-text-secondary font-sans">
          Bienvenido de nuevo a Card Stash
        </p>
      </div>

      {/* Card */}
      <div className="surface-raised p-6 sm:p-8">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* Global error */}
          {globalError && (
            <div
              role="alert"
              className="rounded-lg bg-error-subtle border border-error/20 px-4 py-3 flex flex-col gap-2.5"
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 size-4 shrink-0 rounded-full bg-error/15 text-error flex items-center justify-center text-xs font-bold">
                  !
                </span>
                <p className="text-sm text-error font-sans">{globalError}</p>
              </div>
              {showResend && (
                resendState === "sent" ? (
                  <div className="flex items-center gap-2 text-sm text-success font-sans pl-6">
                    <CheckCircle2 size={14} className="shrink-0" />
                    Correo reenviado. Revisá tu bandeja de entrada.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === "loading"}
                    className="flex items-center gap-1.5 pl-6 text-sm font-medium text-primary hover:text-accent font-sans transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={resendState === "loading" ? "animate-spin" : ""} />
                    {resendState === "loading" ? "Enviando…" : "Reenviar correo de confirmación"}
                  </button>
                )
              )}
            </div>
          )}

          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            value={fields.email}
            onChange={handleChange}
            error={fieldErrors.email}
            leftAddon={<Mail size={15} />}
            disabled={loading}
          />

          <Input
            label="Contraseña"
            name="password"
            type={showPwd ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={fields.password}
            onChange={handleChange}
            error={fieldErrors.password}
            leftAddon={<Lock size={15} />}
            rightAddon={
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="text-text-muted hover:text-text-secondary transition-colors"
                aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
            disabled={loading}
          />

          {/* Forgot password */}
          <div className="text-right -mt-2">
            <Link
              href="/forgot-password"
              className="text-xs text-text-muted hover:text-primary font-sans no-underline transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-1"
            loading={loading}
          >
            Iniciar sesión
          </Button>
        </form>
      </div>

      {/* Footer link */}
      <p className="mt-6 text-center text-sm text-text-secondary font-sans">
        ¿No tenés cuenta?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-accent transition-colors no-underline"
        >
          Registrarse gratis
        </Link>
      </p>
    </div>
  );
}

export default function Page() {
  return <React.Suspense><LoginPage /></React.Suspense>;
}
