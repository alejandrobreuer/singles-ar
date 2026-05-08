import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CheckCircle2, MessageCircle, Tag } from "lucide-react";
import { createAdminClient }  from "@/lib/supabase/admin";
import { createClient }       from "@/lib/supabase/server";
import { Button }               from "@/components/ui/button";
import { PaymentSuccessToast }  from "@/components/payment/PaymentSuccessToast";
import { formatARS }            from "@/lib/formatting";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  // MP appends: payment_id, status, external_reference (= transactionId), preference_id
  const externalRef = searchParams.external_reference;
  const paymentId   = searchParams.payment_id;

  if (!externalRef) redirect("/");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/payment/success?external_reference=${externalRef}`);

  const admin = createAdminClient();

  // Look up transaction by external_reference (= transaction ID we set in preference)
  const { data: tx } = await admin
    .from("transactions")
    .select(`
      id, price, status, buyer_id, seller_id,
      card:cards!card_id ( id, name, image_url, set_name )
    `)
    .eq("id", externalRef)
    .single();

  if (!tx) redirect("/");

  const isBuyer  = tx.buyer_id  === user.id;
  const isSeller = tx.seller_id === user.id;
  if (!isBuyer && !isSeller) redirect("/");

  const card = tx.card as unknown as { id: string; name: string; image_url: string | null; set_name: string | null } | null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <PaymentSuccessToast />
      <div className="max-w-md w-full">

        {/* Success card */}
        <div className="surface-raised p-8 text-center flex flex-col items-center gap-5">

          {/* Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10 border border-success/20">
            <CheckCircle2 size={32} className="text-success" />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">
              ¡Pago confirmado!
            </h1>
            <p className="text-sm text-text-muted font-sans">
              Tu compra fue procesada correctamente por MercadoPago.
            </p>
          </div>

          {/* Card info */}
          {card && (
            <div className="flex items-center gap-3 w-full bg-secondary rounded-xl px-4 py-3">
              <div className="relative shrink-0 w-10 h-14 rounded-lg overflow-hidden border border-border bg-background">
                {card.image_url ? (
                  <Image
                    src={card.image_url}
                    alt={card.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Tag size={14} className="text-border" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold font-sans text-text-primary truncate">
                  {card.name}
                </p>
                {card.set_name && (
                  <p className="text-xs text-text-muted font-sans">{card.set_name}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-price text-lg text-text-primary">
                  {formatARS(Number(tx.price))}
                </p>
              </div>
            </div>
          )}

          {/* MP payment reference */}
          {paymentId && (
            <p className="text-xs text-text-muted font-sans">
              ID de pago: <span className="font-medium text-text-secondary">{paymentId}</span>
            </p>
          )}

          {/* CTA: go to chat */}
          <div className="flex flex-col gap-2.5 w-full">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              leftIcon={<MessageCircle size={16} />}
              asChild
            >
              <Link href={`/chat/${tx.id}`}>
                Ir al chat para coordinar la entrega
              </Link>
            </Button>
            <Button variant="ghost" size="md" className="w-full" asChild>
              <Link href="/">Seguir explorando</Link>
            </Button>
          </div>

          {/* Protection note */}
          <p className="text-xs text-text-muted font-sans leading-relaxed px-2">
            Coordiná la entrega con el vendedor por el chat. Tenés <strong className="text-text-secondary">72 horas</strong> para reportar cualquier problema desde que el vendedor confirme la entrega.
          </p>
        </div>
      </div>
    </div>
  );
}
