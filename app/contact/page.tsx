"use client";

import * as React from "react";
import { Mail, MessageSquare, Clock, Send, CheckCircle } from "lucide-react";
import { z } from "zod";
import { Input }   from "@/components/ui/input";
import { Button }  from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { cn } from "@/lib/utils";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:    z.string().min(2, "Ingresá tu nombre."),
  email:   z.string().email("Ingresá un correo válido."),
  subject: z.string().min(1, "Seleccioná un asunto."),
  message: z.string().min(10, "El mensaje debe tener al menos 10 caracteres."),
});

type Fields     = z.infer<typeof schema>;
type FieldErrors = Partial<Record<keyof Fields, string>>;

const SUBJECTS = [
  "Problema con una transacción",
  "Problema con mi cuenta",
  "Reportar un usuario",
  "Sugerencia o feedback",
  "Consulta sobre pagos",
  "Otro",
];

// ─── Info card ────────────────────────────────────────────────────────────────

function InfoCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="surface-raised p-5 flex gap-4 items-start">
      <div className="size-10 rounded-lg bg-primary/8 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold font-sans text-text-primary mb-0.5">{title}</p>
        <p className="text-sm text-text-muted font-sans">{body}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const [fields,      setFields]      = React.useState<Fields>({ name: "", email: "", subject: "", message: "" });
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [loading,     setLoading]     = React.useState(false);
  const [sent,        setSent]        = React.useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof Fields]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    setGlobalError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = schema.safeParse(fields);
    if (!result.success) {
      const errs: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof Fields;
        if (!errs[key]) errs[key] = issue.message;
      });
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    setGlobalError(null);

    try {
      const res = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(result.data),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setGlobalError(json.error ?? "Hubo un error al enviar tu mensaje. Intentá de nuevo.");
        return;
      }

      setSent(true);
    } catch {
      setGlobalError("Hubo un error al enviar tu mensaje. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Hero */}
      <section className="bg-primary relative overflow-hidden">
        <div
          className="absolute -top-20 -right-20 size-[400px] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, #b5862a 0%, transparent 70%)" }}
        />
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-11">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="block w-5 h-px bg-accent" />
            <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-accent">
              Soporte
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight leading-[1.15] mb-2">
            Contactanos
          </h1>
          <p className="text-sm text-white/50 font-sans max-w-lg">
            ¿Tenés una pregunta o un problema? Completá el formulario y te respondemos a la brevedad.
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-site w-full px-4 sm:px-6 lg:px-8 py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Form */}
          <div className="lg:col-span-2">
            {sent ? (
              <div className="surface-raised p-10 flex flex-col items-center text-center gap-4">
                <div className="size-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle size={32} className="text-success" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-semibold text-text-primary mb-1">
                    ¡Mensaje enviado!
                  </h2>
                  <p className="text-sm text-text-muted font-sans">
                    Recibimos tu consulta. Te respondemos en menos de 24 horas al correo que indicaste.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSent(false); setFields({ name: "", email: "", subject: "", message: "" }); }}
                >
                  Enviar otro mensaje
                </Button>
              </div>
            ) : (
              <div className="surface-raised p-6 sm:p-8">
                <h2 className="font-serif text-lg font-semibold text-text-primary mb-6">
                  Envianos un mensaje
                </h2>

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                  {globalError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-lg bg-error-subtle border border-error/20 px-4 py-3"
                    >
                      <span className="mt-0.5 size-4 shrink-0 rounded-full bg-error/15 text-error flex items-center justify-center text-xs font-bold">!</span>
                      <p className="text-sm text-error font-sans">{globalError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input
                      label="Nombre"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Tu nombre"
                      value={fields.name}
                      onChange={handleChange}
                      error={fieldErrors.name}
                      disabled={loading}
                    />
                    <Input
                      label="Correo electrónico"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="tu@correo.com"
                      value={fields.email}
                      onChange={handleChange}
                      error={fieldErrors.email}
                      disabled={loading}
                    />
                  </div>

                  {/* Subject select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium font-sans text-text-primary">
                      Asunto
                    </label>
                    <select
                      name="subject"
                      value={fields.subject}
                      onChange={handleChange}
                      disabled={loading}
                      className={cn(
                        "w-full rounded-lg border bg-surface px-3 py-2.5 text-sm font-sans text-text-primary",
                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors",
                        fieldErrors.subject ? "border-error" : "border-border",
                        !fields.subject && "text-text-muted"
                      )}
                    >
                      <option value="" disabled>Seleccioná un asunto…</option>
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {fieldErrors.subject && (
                      <p className="text-xs text-error font-sans">{fieldErrors.subject}</p>
                    )}
                  </div>

                  {/* Message textarea */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium font-sans text-text-primary">
                      Mensaje
                    </label>
                    <textarea
                      name="message"
                      value={fields.message}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Describí tu consulta con el mayor detalle posible…"
                      rows={5}
                      className={cn(
                        "w-full rounded-lg border bg-surface px-3 py-2.5 text-sm font-sans text-text-primary",
                        "placeholder:text-text-muted resize-none",
                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors",
                        fieldErrors.message ? "border-error" : "border-border"
                      )}
                    />
                    {fieldErrors.message && (
                      <p className="text-xs text-error font-sans">{fieldErrors.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto sm:self-end"
                    loading={loading}
                    leftIcon={<Send size={15} />}
                  >
                    Enviar mensaje
                  </Button>
                </form>
              </div>
            )}
          </div>

          {/* Info sidebar */}
          <div className="flex flex-col gap-3">
            <InfoCard
              icon={<Clock size={18} />}
              title="Tiempo de respuesta"
              body="Respondemos todos los mensajes en menos de 24 horas hábiles."
            />
            <InfoCard
              icon={<Mail size={18} />}
              title="Correo directo"
              body="hola@cardstash.ar"
            />
            <InfoCard
              icon={<MessageSquare size={18} />}
              title="Reportar un problema"
              body="Si tenés un problema urgente con una transacción, usá el chat dentro de la operación."
            />
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
