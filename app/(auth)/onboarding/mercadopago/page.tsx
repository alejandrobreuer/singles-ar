"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, CreditCard, ArrowRight, ExternalLink, CheckCircle2 } from "lucide-react";
import { buildMPAuthUrl } from "@/lib/auth/utils";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { StepIndicator } from "@/components/auth/StepIndicator";

// ─── Step indicator (registro → apodo → mercadopago) ─────────────────────────

const STEPS = [
  { label: "Cuenta"       },
  { label: "Apodo"        },
  { label: "MercadoPago"  },
];

// ─── Steps explanation ────────────────────────────────────────────────────────

const FLOW_STEPS = [
  {
    icon:  <ShieldCheck size={18} className="text-primary" />,
    title: "Autorizá el acceso",
    desc:  "Te redirigimos a MercadoPago para que autoricés a Singles.ar a procesar cobros en tu nombre.",
  },
  {
    icon:  <CreditCard size={18} className="text-primary" />,
    title: "Conectamos tu cuenta",
    desc:  "Una vez autorizado, vinculamos tu cuenta de MercadoPago de forma segura. Nunca guardamos tu contraseña.",
  },
  {
    icon:  <CheckCircle2 size={18} className="text-success" />,
    title: "Listo para vender",
    desc:  "Los compradores podrán pagarte directamente. Cada venta acredita el importe en tu cuenta MP.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MercadoPagoOnboardingPage() {
  const router   = useRouter();
  const [loading, setLoading] = React.useState(false);

  function handleConnect() {
    setLoading(true);
    // Build URL client-side so it works from the browser env variables
    const url = buildMPAuthUrl();
    window.location.href = url;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">
          Conectá MercadoPago
        </h1>
        <p className="text-sm text-text-secondary font-sans">
          Para vender necesitás vincular tu cuenta de MercadoPago
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} currentStep={2} className="mb-8" />

      {/* Card */}
      <div className="surface-raised p-6 sm:p-8">
        {/* MP logo area */}
        <div className="flex items-center justify-center gap-3 mb-6 py-4 rounded-xl bg-[#009ee3]/5 border border-[#009ee3]/15">
          {/* MercadoPago brand colors */}
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-[#009ee3] text-xl">Mercado</span>
            <span className="font-serif font-bold text-[#00b1ea] text-xl">Pago</span>
          </div>
          <span className="text-text-muted text-sm font-sans">×</span>
          <span className="font-serif font-semibold text-text-primary text-xl">
            Singles<span className="text-accent">.</span>ar
          </span>
        </div>

        {/* Flow steps */}
        <div className="flex flex-col gap-4 mb-6">
          {FLOW_STEPS.map((s, i) => (
            <div key={i} className="flex gap-3.5 items-start">
              {/* Number + connector */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="size-8 rounded-full bg-primary/[0.08] border border-primary/[0.15] flex items-center justify-center">
                  {s.icon}
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="w-px h-4 bg-border" />
                )}
              </div>
              {/* Text */}
              <div className="pt-1 pb-2">
                <p className="text-sm font-semibold text-text-primary font-sans mb-0.5">
                  {s.title}
                </p>
                <p className="text-sm text-text-secondary font-sans leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Divider className="mb-6" />

        {/* Security notice */}
        <div className="flex gap-2.5 mb-6 text-xs text-text-muted font-sans">
          <ShieldCheck size={14} className="shrink-0 mt-0.5 text-success" />
          <p>
            La conexión utiliza OAuth 2.0 oficial de MercadoPago. Singles.ar
            solo accede a cobros — nunca a transferencias o datos personales.
          </p>
        </div>

        {/* CTA */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          onClick={handleConnect}
          rightIcon={<ExternalLink size={15} />}
        >
          Conectar MercadoPago
        </Button>
      </div>

      {/* Skip link */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-text-muted hover:text-text-secondary font-sans transition-colors flex items-center gap-1.5"
        >
          <ArrowRight size={13} />
          Saltar por ahora — lo hago después desde mi perfil
        </button>
        <p className="text-xs text-text-muted font-sans text-center max-w-sm">
          Podés explorar y comprar sin conectar MercadoPago.{" "}
          <strong className="text-text-secondary">Para vender, es obligatorio.</strong>
        </p>
      </div>
    </div>
  );
}
