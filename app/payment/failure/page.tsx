import * as React from "react";
import Link from "next/link";
import { XCircle, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentFailurePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const transactionId = searchParams.external_reference;
  const statusDetail  = searchParams.status_detail;

  // Map MP status_detail codes to human-readable messages
  const errorMessages: Record<string, string> = {
    cc_rejected_insufficient_amount: "Fondos insuficientes en tu tarjeta.",
    cc_rejected_bad_filled_card_number: "El número de tarjeta es incorrecto.",
    cc_rejected_bad_filled_date: "La fecha de vencimiento es incorrecta.",
    cc_rejected_bad_filled_security_code: "El código de seguridad es incorrecto.",
    cc_rejected_blacklist: "No pudimos procesar tu pago con esta tarjeta.",
    cc_rejected_call_for_authorize: "Tu banco requiere autorización. Llamá a tu banco.",
    cc_rejected_card_disabled: "Tu tarjeta está deshabilitada.",
    cc_rejected_high_risk: "Tu pago fue rechazado por seguridad.",
    cc_rejected_max_attempts: "Superaste el límite de intentos. Usá otro medio de pago.",
  };

  const errorMsg = (statusDetail && errorMessages[statusDetail])
    ?? "Tu pago no pudo ser procesado. Podés intentarlo de nuevo o usar otro medio de pago.";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="surface-raised p-8 text-center flex flex-col items-center gap-5">

          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-error/10 border border-error/20">
            <XCircle size={32} className="text-error" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">
              El pago no fue aprobado
            </h1>
            <p className="text-sm text-text-muted font-sans leading-relaxed max-w-xs">
              {errorMsg}
            </p>
          </div>

          {/* Tips */}
          <div className="w-full bg-secondary rounded-xl px-4 py-3 text-left">
            <p className="text-xs font-semibold font-sans text-text-secondary mb-2">Podés intentar:</p>
            <ul className="text-xs text-text-muted font-sans space-y-1 list-disc list-inside">
              <li>Usar otra tarjeta o medio de pago</li>
              <li>Verificar los datos ingresados</li>
              <li>Contactar a tu banco</li>
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2.5 w-full">
            {transactionId && (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                leftIcon={<RefreshCw size={15} />}
                asChild
              >
                <Link href={`/chat/${transactionId}`}>
                  Volver al chat e intentar de nuevo
                </Link>
              </Button>
            )}
            <Button variant="secondary" size="md" className="w-full" asChild>
              <Link href={transactionId ? `/chat/${transactionId}` : "/chat"} >
                <MessageCircle size={15} className="mr-1.5" />
                Hablar con el vendedor
              </Link>
            </Button>
            <Button variant="ghost" size="md" className="w-full" asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
