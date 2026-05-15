"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
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

  const [fields,      setFields]      = React.useState<LoginFields>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [loading,     setLoading]     = React.useState(false);
  const [showPwd,     setShowPwd]     = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (fieldErrors[name as keyof LoginFields]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setGlobalError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation
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

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email:    result.data.email,
        password: result.data.password,
      });

      if (error) {
        setGlobalError(mapAuthError(error));
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
              className="flex items-start gap-2.5 rounded-lg bg-error-subtle border border-error/20 px-4 py-3"
            >
              <span className="mt-0.5 size-4 shrink-0 rounded-full bg-error/15 text-error flex items-center justify-center text-xs font-bold">
                !
              </span>
              <p className="text-sm text-error font-sans">{globalError}</p>
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
