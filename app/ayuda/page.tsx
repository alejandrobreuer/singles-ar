"use client";

import * as React from "react";
import { ChevronDown, Mail, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiteFooter } from "@/components/layout/SiteFooter";

// ─── FAQ data ──────────────────────────────────────────────────────────────────

const FAQS: { question: string; answer: string }[] = [
  {
    question: "¿Por qué la comisión de MercadoPago fue diferente a la estimada?",
    answer:
      "La comisión de MP varía según la provincia del vendedor, el método de pago usado por el comprador y el historial de la cuenta. Mostramos una estimación basada en transacciones reales, pero el monto exacto lo define MercadoPago en el momento del pago. El detalle real siempre aparece en tu actividad de MercadoPago.",
  },
  {
    question: "¿Cuándo recibo el dinero de mi venta?",
    answer:
      'MercadoPago puede demorar entre 1 y 20 días hábiles en acreditar el dinero según el historial de tu cuenta. Las cuentas nuevas tienen mayor demora — esto mejora automáticamente con cada venta completada. La fecha exacta aparece en tu actividad de MercadoPago como "Total a recibir el [fecha]".',
  },
  {
    question: "¿Qué es la comisión de CardStash.ar?",
    answer:
      "CardStash.ar cobra un 5% fijo sobre el precio de venta publicado. Esta comisión es siempre exacta y no varía. Es independiente de la comisión de MP.",
  },
  {
    question: "¿Qué hago si algo no funciona correctamente?",
    answer:
      "Escribinos a cardstash.ar@gmail.com o por WhatsApp al +54 9 11 2713-5655. Somos un equipo pequeño y respondemos a la brevedad. Si encontrás un bug, más detalle = más rápido lo resolvemos.",
  },
  {
    question: "¿Es seguro pagar en CardStash.ar?",
    answer:
      "Los pagos se procesan directamente por MercadoPago — CardStash.ar nunca toca tus datos de tarjeta. MP es la plataforma de pagos más usada en Argentina con más de 20 años en el mercado.",
  },
  {
    question: "¿Qué pasa si tengo un problema con una transacción?",
    answer:
      "Tenés 72 horas desde que el vendedor confirma la entrega para reportar un problema. Abrí una disputa desde el chat de la transacción y el equipo de CardStash.ar va a revisar el caso.",
  },
  {
    question: "¿Por qué CardStash.ar está en beta?",
    answer:
      "Somos una plataforma nueva, lanzada recientemente. Estamos en beta porque queremos mejorar con feedback real de la comunidad antes de considerar el producto terminado. Puede haber imperfecciones — si encontrás alguna, contanos.",
  },
];

// ─── Accordion item ────────────────────────────────────────────────────────────

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="surface-raised overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold font-sans text-text-primary">{question}</span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-text-muted transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 -mt-1">
          <p className="text-sm font-sans text-text-secondary leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AyudaPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Hero */}
      <section className="bg-primary">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex items-center gap-2 mb-3">
            <span className="block w-5 h-px bg-accent" />
            <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-accent">Ayuda</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">
            Centro de ayuda
          </h1>
          <p className="text-sm text-white/50 font-sans">
            Preguntas frecuentes
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-10">
        <div className="flex flex-col gap-3 mb-10">
          {FAQS.map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>

        <div className="surface-raised p-6 text-center flex flex-col items-center gap-3">
          <h2 className="font-serif text-lg font-semibold text-text-primary">
            ¿No encontraste lo que buscabas?
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:cardstash.ar@gmail.com"
              className="inline-flex items-center gap-2 text-sm font-sans font-medium text-primary hover:text-accent transition-colors"
            >
              <Mail size={15} />
              Escribinos por email
            </a>
            <span className="text-border">·</span>
            <a
              href="https://wa.me/5491127135655"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-sans font-medium text-primary hover:text-accent transition-colors"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
