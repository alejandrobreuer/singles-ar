import * as React from "react";
import Link from "next/link";
import { Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentPendingPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const transactionId = searchParams.external_reference;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="surface-raised p-8 text-center flex flex-col items-center gap-5">

          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-warning/10 border border-warning/20">
            <Clock size={32} className="text-warning" />
          </div>

          <div>
            <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">
              Pago pendiente
            </h1>
            <p className="text-sm text-text-muted font-sans leading-relaxed max-w-xs">
              Tu pago está siendo procesado. Recibirás una confirmación cuando se acredite.
              Esto puede demorar hasta 2 días hábiles.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full">
            {transactionId && (
              <Button variant="primary" size="lg" className="w-full" asChild>
                <Link href={`/chat/${transactionId}`}>
                  <MessageCircle size={15} className="mr-1.5" />
                  Ir al chat
                </Link>
              </Button>
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
