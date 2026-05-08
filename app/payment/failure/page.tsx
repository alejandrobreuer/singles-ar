import * as React from "react";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RetryPaymentButton } from "@/components/payment/RetryPaymentButton";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentFailurePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const transactionId = searchParams.external_reference;
  const statusDetail  = searchParams.status_detail;

  const errorMessages: Record<string, { title: string; detail: string }> = {
    cc_rejected_insufficient_amount:    { title: "Fondos insuficientes",           detail: "Tu tarjeta no tiene saldo suficiente para completar el pago." },
    cc_rejected_bad_filled_card_number: { title: "Número de tarjeta incorrecto",   detail: "Verificá que el número ingresado sea correcto." },
    cc_rejected_bad_filled_date:        { title: "Fecha de vencimiento incorrecta", detail: "Revisá la fecha de vencimiento de tu tarjeta." },
    cc_rejected_bad_filled_security_code: { title: "Código de seguridad incorrecto", detail: "El CVV ingresado no coincide con tu tarjeta." },
    cc_rejected_blacklist:              { title: "Tarjeta no aceptada",             detail: "No pudimos procesar tu pago con esta tarjeta." },
    cc_rejected_call_for_authorize:     { title: "Requiere autorización del banco", detail: "Tu banco bloqueó el pago. Comunicate con ellos para habilitarlo." },
    cc_rejected_card_disabled:          { title: "Tarjeta deshabilitada",           detail: "Tu tarjeta está deshabilitada. Contactá a tu banco." },
    cc_rejected_high_risk:              { title: "Rechazado por seguridad",         detail: "MercadoPago rechazó el pago por prevención de fraude." },
    cc_rejected_max_attempts:           { title: "Demasiados intentos",             detail: "Superaste el límite de intentos. Esperá unos minutos o usá otro medio de pago." },
    pending_contingency:                { title: "Pago en revisión",                detail: "Tu pago está siendo revisado. Te avisaremos cuando se confirme." },
    pending_review_manual:              { title: "Pago en revisión manual",         detail: "El pago está siendo revisado por MercadoPago. Puede demorar hasta 48 h." },
  };

  const err = (statusDetail ? errorMessages[statusDetail] : undefined) ?? {
    title:  "Pago no aprobado",
    detail: "Tu pago no pudo ser procesado. Podés intentarlo de nuevo o usar otro medio de pago.",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="surface-raised p-8 text-center flex flex-col items-center gap-5">

          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-error/10 border border-error/20">
            <XCircle size={32} className="text-error" />
          </div>

          {/* Title + error detail */}
          <div>
            <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">
              {err.title}
            </h1>
            <p className="text-sm text-text-muted font-sans leading-relaxed max-w-xs">
              {err.detail}
            </p>
            {statusDetail && (
              <p className="mt-2 text-2xs text-text-muted font-sans font-mono">
                Código: {statusDetail}
              </p>
            )}
          </div>

          {/* Tips */}
          <div className="w-full bg-secondary rounded-xl px-4 py-3 text-left">
            <p className="text-xs font-semibold font-sans text-text-secondary mb-2">Podés intentar:</p>
            <ul className="text-xs text-text-muted font-sans space-y-1 list-disc list-inside">
              <li>Usar otra tarjeta o medio de pago</li>
              <li>Verificar los datos ingresados</li>
              <li>Contactar a tu banco si el problema persiste</li>
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2.5 w-full">
            {transactionId && (
              <RetryPaymentButton transactionId={transactionId} />
            )}
            <Button variant="ghost" size="md" className="w-full" asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
