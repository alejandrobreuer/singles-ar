"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, AtSign, CheckCircle2, XCircle, Loader2, Info } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth/errors";
import { validateUsername } from "@/lib/auth/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepIndicator } from "@/components/auth/StepIndicator";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Cuenta",  sublabel: "Email y contraseña" },
  { label: "Apodo",   sublabel: "Tu nombre público"  },
];

// ─── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z
  .object({
    email:    z.string().email("Ingresá un correo válido."),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .regex(/[A-Z]/, "Incluí al menos una letra mayúscula.")
      .regex(/[0-9]/, "Incluí al menos un número."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden.",
    path:    ["confirm"],
  });

type Step1Fields  = z.infer<typeof step1Schema>;
type Step1Errors  = Partial<Record<keyof Step1Fields, string>>;

// ─── Username status ──────────────────────────────────────────────────────────

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  // ── Stepper
  const [step, setStep] = React.useState(0);

  // ── Step 1 state
  const [s1, setS1] = React.useState<Step1Fields>({
    email: "", password: "", confirm: "",
  });
  const [s1Errors,    setS1Errors]    = React.useState<Step1Errors>({});
  const [showPwd,     setShowPwd]     = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  // ── Step 2 state
  const [username,        setUsername]        = React.useState("");
  const [usernameStatus,  setUsernameStatus]  = React.useState<UsernameStatus>("idle");
  const [usernameMessage, setUsernameMessage] = React.useState<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Global
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [loading,     setLoading]     = React.useState(false);

  // ─── Step 1: handle fields
  function handleS1Change(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setS1((prev) => ({ ...prev, [name]: value }));
    if (s1Errors[name as keyof Step1Fields]) {
      setS1Errors((prev) => ({ ...prev, [name]: undefined }));
    }
    setGlobalError(null);
  }

  function handleS1Submit(e: React.FormEvent) {
    e.preventDefault();
    const result = step1Schema.safeParse(s1);
    if (!result.success) {
      const errs: Step1Errors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof Step1Fields;
        if (!errs[key]) errs[key] = issue.message;
      });
      setS1Errors(errs);
      return;
    }
    setStep(1);
  }

  // ─── Step 2: username availability check (debounced 300ms)
  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\s/g, "");  // strip spaces
    setUsername(value);
    setUsernameStatus("idle");
    setUsernameMessage(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value) return;

    // Validate format locally first
    const formatError = validateUsername(value);
    if (formatError) {
      setUsernameStatus("invalid");
      setUsernameMessage(formatError);
      return;
    }

    // Debounce the API call
    debounceRef.current = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const res  = await fetch(`/api/auth/check-username?username=${encodeURIComponent(value)}`);
        const data = await res.json() as { available: boolean; error?: string };
        if (data.available) {
          setUsernameStatus("available");
          setUsernameMessage("¡Disponible!");
        } else {
          setUsernameStatus("taken");
          setUsernameMessage(data.error ?? "Ese apodo ya está en uso. Probá con otro.");
        }
      } catch {
        setUsernameStatus("idle");
        setUsernameMessage(null);
      }
    }, 300);
  }

  // ─── Final submit: create Supabase user + profile
  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Guard: username must be available
    if (usernameStatus !== "available") return;

    setLoading(true);
    setGlobalError(null);

    try {
      const supabase = createClient();

      // 1. Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email:    s1.email,
        password: s1.password,
      });

      if (signUpError) {
        setGlobalError(mapAuthError(signUpError));
        setStep(0);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setGlobalError("No se pudo crear la cuenta. Intentá de nuevo.");
        return;
      }

      // 2. Set the chosen username on the profile the trigger auto-created
      const usernameRes = await fetch("/api/auth/set-username", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, username: username.toLowerCase() }),
      });

      if (!usernameRes.ok) {
        const json = await usernameRes.json().catch(() => ({}));
        console.error("[register] set-username error:", json);
        setGlobalError(json.error ?? "Cuenta creada, pero no pudimos guardar tu apodo. Contactá soporte.");
        return;
      }

      // 3. Go to onboarding
      router.push("/onboarding/mercadopago");
    } catch (err) {
      setGlobalError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Username input right addon
  const usernameAddon = React.useMemo(() => {
    if (!username) return null;
    switch (usernameStatus) {
      case "checking":
        return <Loader2 size={15} className="animate-spin text-text-muted" />;
      case "available":
        return <CheckCircle2 size={15} className="text-success" />;
      case "taken":
      case "invalid":
        return <XCircle size={15} className="text-error" />;
      default:
        return null;
    }
  }, [username, usernameStatus]);

  const usernameError =
    usernameStatus === "taken" || usernameStatus === "invalid"
      ? (usernameMessage ?? undefined)
      : undefined;

  const usernameHelper =
    usernameStatus === "available"
      ? usernameMessage ?? undefined
      : usernameStatus === "checking"
      ? "Verificando disponibilidad…"
      : usernameStatus === "idle" && username === ""
      ? "Este será tu nombre visible en el marketplace."
      : undefined;

  // ─── Render
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">
          Crear cuenta
        </h1>
        <p className="text-sm text-text-secondary font-sans">
          Empezá a comprar y vender singles en Argentina
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} currentStep={step} className="mb-8" />

      {/* Card */}
      <div className="surface-raised p-6 sm:p-8">
        {/* Global error */}
        {globalError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-error-subtle border border-error/20 px-4 py-3 mb-5"
          >
            <span className="mt-0.5 size-4 shrink-0 rounded-full bg-error/15 text-error flex items-center justify-center text-xs font-bold">
              !
            </span>
            <p className="text-sm text-error font-sans">{globalError}</p>
          </div>
        )}

        {/* ── Step 1: email + password ───────────────────────────── */}
        {step === 0 && (
          <form onSubmit={handleS1Submit} noValidate className="flex flex-col gap-5">
            <Input
              label="Correo electrónico"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={s1.email}
              onChange={handleS1Change}
              error={s1Errors.email}
              leftAddon={<Mail size={15} />}
            />

            <Input
              label="Contraseña"
              name="password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={s1.password}
              onChange={handleS1Change}
              error={s1Errors.password}
              helperText={!s1Errors.password ? "Usá mayúsculas y números para una contraseña segura." : undefined}
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
            />

            <Input
              label="Repetir contraseña"
              name="confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repetí tu contraseña"
              value={s1.confirm}
              onChange={handleS1Change}
              error={s1Errors.confirm}
              leftAddon={<Lock size={15} />}
              rightAddon={
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="text-text-muted hover:text-text-secondary transition-colors"
                  aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            <Button type="submit" variant="primary" size="lg" className="w-full mt-1">
              Continuar
            </Button>
          </form>
        )}

        {/* ── Step 2: choose username ────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleFinalSubmit} noValidate className="flex flex-col gap-5">
            {/* Info callout */}
            <div className="flex gap-3 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
              <Info size={16} className="shrink-0 mt-0.5 text-primary/60" />
              <div className="flex flex-col gap-1 text-xs font-sans text-text-secondary">
                <p>
                  <span className="font-semibold text-text-primary">Tu apodo</span> es lo que
                  otros usuarios verán en el marketplace.
                </p>
                <ul className="mt-1 space-y-0.5 list-none pl-0">
                  <li className="flex items-center gap-1.5">
                    <span className="size-1 rounded-full bg-success inline-block" />
                    Tu apodo es <strong>visible públicamente</strong>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="size-1 rounded-full bg-warning inline-block" />
                    Tu email <strong>nunca se muestra</strong>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="size-1 rounded-full bg-text-muted inline-block" />
                    Tu ID interno es <strong>privado</strong>
                  </li>
                </ul>
              </div>
            </div>

            <Input
              label="Apodo (nombre de usuario)"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="ej: dragonito_tcg"
              value={username}
              onChange={handleUsernameChange}
              error={usernameError}
              helperText={!usernameError ? usernameHelper : undefined}
              leftAddon={<AtSign size={15} />}
              rightAddon={usernameAddon}
              maxLength={20}
            />

            {/* Character counter */}
            <div className="-mt-3 text-right">
              <span className={`text-xs font-sans ${username.length >= 20 ? "text-warning" : "text-text-muted"}`}>
                {username.length}/20
              </span>
            </div>

            <div className="flex gap-3 mt-1">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => setStep(0)}
                disabled={loading}
              >
                Volver
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1"
                loading={loading}
                disabled={usernameStatus !== "available" || loading}
              >
                Crear cuenta
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Footer link */}
      <p className="mt-6 text-center text-sm text-text-secondary font-sans">
        ¿Ya tenés cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-accent transition-colors no-underline"
        >
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
