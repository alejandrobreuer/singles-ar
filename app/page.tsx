import type { Metadata } from "next";
import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";

export const metadata: Metadata = {
  title: "Singles.ar — Marketplace de cartas TCG en Argentina",
  description:
    "El primer marketplace P2P de singles TCG en Argentina. Comprá, vendé e intercambiá cartas de Magic, Pokémon y One Piece con pagos seguros vía MercadoPago.",
  openGraph: {
    title:       "Singles.ar — Marketplace de cartas TCG en Argentina",
    description: "Comprá, vendé e intercambiá cartas de Magic, Pokémon y One Piece en Argentina.",
    type:        "website",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Topbar />

      <main className="flex-1">
        <HeroSection />
        <GamesStrip />
        <HowItWorksSection />
        <FeaturesSection />
        <BuyOrdersSection />
        <CommissionSection />
        <TrustSection />
        <CTASection />
      </main>

      <footer className="bg-[#111827] py-5 px-6 sm:px-12 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.png" alt="Singles.ar" className="h-6 w-auto object-contain opacity-60" />
        </Link>
        <p className="text-xs font-sans" style={{ color: "rgba(255,255,255,0.3)" }}>
          © {new Date().getFullYear()} Singles.ar · Marketplace TCG Argentina
        </p>
      </footer>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="bg-primary relative overflow-hidden">
      {/* Decorative blobs */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 w-96 h-96 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(181,134,42,0.12) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 left-1/4 w-72 h-72 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(30,95,168,0.15) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 sm:px-12 py-20 sm:py-24">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-px bg-accent/70" />
          <span className="text-2xs font-semibold font-sans uppercase tracking-widest" style={{ color: "#d4a84b" }}>
            El marketplace TCG de Argentina
          </span>
        </div>

        {/* H1 */}
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-white leading-tight tracking-tight mb-5">
          Comprá y vendé singles<br />
          con{" "}
          <em className="not-italic" style={{ color: "#d4a84b" }}>otros jugadores.</em>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg font-sans max-w-xl leading-relaxed mb-9" style={{ color: "rgba(255,255,255,0.6)" }}>
          El primer marketplace P2P dedicado a cartas TCG en Argentina. Precios reales, pagos seguros vía MercadoPago, y toda la información que necesitás para tomar la mejor decisión.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 items-center">
          <Link
            href="/cards"
            className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-white px-7 py-3.5 rounded-lg no-underline transition-all hover:-translate-y-px"
            style={{ background: "#b5862a" }}
          >
            Explorar cartas →
          </Link>
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 font-sans text-sm font-medium text-white px-7 py-3.5 rounded-lg no-underline transition-colors"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Publicar una carta
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-10 mt-14 pt-9 border-t border-white/10">
          {[
            { val: "Magic",     lbl: "The Gathering" },
            { val: "Pokémon",   lbl: "TCG"           },
            { val: "One Piece", lbl: "Card Game"     },
            { val: "+ más",     lbl: "próximamente"  },
          ].map(({ val, lbl }) => (
            <div key={val}>
              <div className="font-serif text-2xl font-bold text-white">{val}</div>
              <div className="text-xs font-sans mt-0.5 tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Games Strip ──────────────────────────────────────────────────────────────

function GamesStrip() {
  return (
    <div className="bg-surface border-b border-border px-6 sm:px-12 py-4 flex flex-wrap items-center gap-8">
      <span className="text-2xs font-semibold font-sans uppercase tracking-widest text-text-muted whitespace-nowrap">
        Juegos disponibles
      </span>
      <div className="flex flex-wrap gap-3">
        <GamePill color="#7b5ea7" label="Magic: The Gathering" />
        <GamePill color="#e86c2c" label="Pokémon TCG" />
        <GamePill color="#c0392b" label="One Piece Card Game" />
      </div>
    </div>
  );
}

function GamePill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium font-sans text-text-secondary px-3.5 py-1.5 rounded-full border border-border bg-background">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorksSection() {
  return (
    <section className="bg-background px-6 sm:px-12 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionEyebrow>Cómo funciona</SectionEyebrow>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary tracking-tight leading-snug mb-3">
          Simple para compradores.<br />Simple para vendedores.
        </h2>
        <p className="text-sm sm:text-base font-sans text-text-secondary max-w-lg leading-relaxed">
          Todo pasa dentro de la plataforma — desde el primer contacto hasta el pago. Sin intermediarios, sin sorpresas.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-14">
          {/* Compradores */}
          <div>
            <div className="flex items-center gap-3 mb-6 pb-3.5 border-b-2 border-border">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "#edf7f2" }}>🛍️</div>
              <span className="font-serif text-[17px] font-semibold text-primary">Si querés comprar</span>
            </div>
            <div className="flex flex-col">
              <Step n={1} title="Buscá tu carta">
                Encontrá cualquier carta por nombre, set o número. Cada carta tiene su propia página con todos los listings disponibles ordenados por precio.
              </Step>
              <Step n={2} title="Comparé precios y vendedores" tag={{ label: "Gratis consultar", style: "free" }}>
                Ves el precio median de TCGPlayer como referencia, el historial de precios, y la reputación de cada vendedor — todo en un solo lugar.
              </Step>
              <Step n={3} title="Pagá con MercadoPago" tag={{ label: "Pago seguro", style: "mp" }}>
                Seleccionás el listing y pagás de forma segura vía MercadoPago. El dinero queda retenido en la plataforma — el vendedor aún no lo recibe.
              </Step>
              <Step n={4} title="Coordiná la entrega por chat" tag={{ label: "Chat habilitado post-pago", style: "chat" }}>
                Una vez confirmado el pago, se habilita el chat con el vendedor. Coordinan el encuentro, pedís fotos si querés, y acordán cómo y dónde entregar la carta.
              </Step>
              <Step n={5} title="Confirmás la entrega → vendedor cobra" last tag={{ label: "Tu dinero protegido", style: "free" }}>
                Cuando recibís la carta y estás conforme, confirmás la entrega en la plataforma. Recién ahí el dinero se acredita en la cuenta del vendedor.
              </Step>
            </div>
          </div>

          {/* Vendedores */}
          <div>
            <div className="flex items-center gap-3 mb-6 pb-3.5 border-b-2 border-border">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "#eef4fd" }}>💰</div>
              <span className="font-serif text-[17px] font-semibold text-primary">Si querés vender</span>
            </div>
            <div className="flex flex-col">
              <Step n={1} title="Creá tu cuenta y vinculá MP">
                Registrate con un apodo público — tu email y datos reales nunca se muestran a otros usuarios. Vinculá tu MercadoPago una sola vez de forma automática.
              </Step>
              <Step n={2} title="Publicá tu carta">
                Buscá la carta en nuestro catálogo, ponele precio, y agregá un comentario opcional sobre el estado. Sin fotos obligatorias.
              </Step>
              <Step n={3} title="Coordiná la entrega por chat" tag={{ label: "Chat post-pago", style: "chat" }}>
                Cuando el comprador paga, se habilita el chat. Coordinan el encuentro, podés enviar fotos del estado real de la carta.
              </Step>
              <Step n={4} title="El comprador confirma → recibís el dinero" last tag={{ label: "Acreditación garantizada", style: "mp" }}>
                El dinero queda retenido hasta que el comprador confirma la entrega. Una vez confirmada, el monto se acredita en tu MercadoPago en 1–2 días hábiles.
              </Step>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type TagStyle = "mp" | "chat" | "free";

const TAG_STYLES: Record<TagStyle, string> = {
  mp:   "bg-[#e8f4e8] text-[#1a7a4a]",
  chat: "bg-[#eef4fd] text-[#1e5fa8]",
  free: "bg-[#f5e6c0] text-[#b5862a]",
};

function Step({
  n, title, children, last, tag,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  last?: boolean;
  tag?: { label: string; style: TagStyle };
}) {
  return (
    <div className={`flex gap-4 py-5 ${last ? "" : "border-b border-border"}`}>
      <div className="w-8 h-8 rounded-full bg-primary text-white font-serif text-sm font-semibold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <div className="text-sm font-semibold font-sans text-primary mb-1">{title}</div>
        <div className="text-xs font-sans text-text-secondary leading-relaxed">{children}</div>
        {tag && (
          <span className={`inline-block text-2xs font-semibold font-sans uppercase tracking-wide px-1.5 py-0.5 rounded mt-1.5 ${TAG_STYLES[tag.style]}`}>
            {tag.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: "📊", bg: "rgba(26,39,68,0.08)",
    title: "Precios de referencia reales",
    desc:  "Cada carta muestra el precio median de TCGPlayer y el historial de precios de nuestra plataforma. Nunca más pagués de más sin saberlo.",
  },
  {
    icon: "🔄", bg: "#f5e6c0",
    title: "Sección de trades",
    desc:  "¿Preferís intercambiar cartas? Publicá tu carta como trade y acordá el canje con otros jugadores directamente en el chat, con o sin diferencia en plata.",
  },
  {
    icon: "⭐", bg: "#edf7f2",
    title: "Reputación verificada",
    desc:  "Cada vendedor tiene un historial público de transacciones y calificaciones de compradores reales. Comprá con confianza basada en datos.",
  },
  {
    icon: "🔔", bg: "#eef4fd",
    title: "Wishlist con alertas",
    desc:  "¿La carta que buscás no tiene stock? Agregala a tu wishlist y te avisamos cuando alguien la publique. No te perdés nada.",
  },
  {
    icon: "🛡️", bg: "#fdf0ee",
    title: "Identidad protegida",
    desc:  "Tu email y datos reales nunca son visibles. Solo tu apodo público. El chat es interno — ningún dato de contacto se expone sin que vos lo elijas compartir.",
  },
  {
    icon: "💬", bg: "#edf0f7",
    title: "Chat post-pago con fotos",
    desc:  "Una vez que el pago se confirma, el chat entre comprador y vendedor se habilita. Coordinan la entrega, comparten fotos, y cierran el trato dentro de la plataforma.",
  },
] as const;

function FeaturesSection() {
  return (
    <section className="bg-surface px-6 sm:px-12 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionEyebrow>Por qué Singles.ar</SectionEyebrow>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary tracking-tight leading-snug">
          Todo lo que necesitás<br />en un solo lugar.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-surface border border-border rounded-xl p-7 transition-all hover:shadow-card-lg hover:-translate-y-0.5"
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4" style={{ background: f.bg }}>
                {f.icon}
              </div>
              <div className="text-sm font-semibold font-sans text-primary mb-1.5">{f.title}</div>
              <div className="text-xs font-sans text-text-secondary leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Buy Orders ───────────────────────────────────────────────────────────────

function BuyOrdersSection() {
  return (
    <section className="bg-background px-6 sm:px-12 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionEyebrow>Funcionalidad exclusiva</SectionEyebrow>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary tracking-tight leading-snug mb-3">
          Buy Orders: comprá<br />al precio que querés.
        </h2>
        <p className="text-sm sm:text-base font-sans text-text-secondary max-w-lg leading-relaxed">
          ¿No encontrás la carta al precio que buscás? Publicá una oferta de compra y esperá a que un vendedor la acepte.
        </p>

        <div
          className="bg-primary rounded-2xl p-10 mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative overflow-hidden"
        >
          {/* Glow */}
          <div
            className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(181,134,42,0.15) 0%, transparent 70%)" }}
          />

          {/* Left */}
          <div className="relative z-10">
            <div className="text-2xs font-semibold font-sans uppercase tracking-widest mb-2.5" style={{ color: "#d4a84b" }}>
              ¿Cómo funciona?
            </div>
            <h3 className="font-serif text-2xl font-bold text-white mb-3.5 leading-snug">
              Poné tu precio.<br />El mercado viene a vos.
            </h3>
            <p className="text-sm font-sans leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.6)" }}>
              En vez de esperar a que aparezca el precio que buscás, publicás una oferta de compra con tu precio máximo. Los vendedores la ven y pueden aceptarla directamente.
            </p>
            <div className="flex flex-col gap-3">
              {[
                { n: 1, text: <><strong className="text-white">Creás un buy order</strong><span style={{ color: "rgba(255,255,255,0.7)" }}> con el precio máximo que estás dispuesto a pagar y cuántos días querés mantener la oferta.</span></> },
                { n: 2, text: <><strong className="text-white">Un vendedor acepta</strong><span style={{ color: "rgba(255,255,255,0.7)" }}> — el comprador paga vía MercadoPago y el dinero queda retenido en la plataforma.</span></> },
                { n: 3, text: <><strong className="text-white">Se habilita el chat</strong><span style={{ color: "rgba(255,255,255,0.7)" }}> para coordinar la entrega. Una vez que el comprador confirma que recibió la carta, el vendedor cobra.</span></> },
              ].map(({ n, text }) => (
                <div key={n} className="flex gap-3 items-start">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-serif text-xs font-semibold shrink-0"
                    style={{ background: "rgba(181,134,42,0.2)", border: "1px solid #b5862a", color: "#d4a84b" }}
                  >
                    {n}
                  </div>
                  <div className="text-sm font-sans leading-snug">{text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Mockup */}
          <div
            className="relative z-10 rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="text-2xs font-semibold font-sans uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
              Buy orders activos — Charizard VMAX
            </div>
            {[
              { user: "TorugaRed ★★★★★", price: "$1.700", meta: "Vence en 18 días · 5.0 · 47 transacciones" },
              { user: "NorteCards ★★★★☆",  price: "$1.600", meta: "Vence en 5 días · 4.2 · 23 transacciones"  },
            ].map(({ user, price, meta }) => (
              <div
                key={user}
                className="rounded-lg p-3.5 mb-2.5 last:mb-0"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium font-sans text-white">{user}</span>
                  <span className="font-serif text-base font-semibold" style={{ color: "#7eb8ff" }}>{price}</span>
                </div>
                <div className="text-2xs font-sans mb-2.5" style={{ color: "rgba(255,255,255,0.4)" }}>{meta}</div>
                <div
                  className="w-full text-center text-xs font-medium font-sans py-1.5 rounded-md"
                  style={{ background: "rgba(74,158,255,0.15)", border: "1px solid rgba(74,158,255,0.3)", color: "#7eb8ff" }}
                >
                  Aceptar buy order
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Commission ───────────────────────────────────────────────────────────────

function CommissionSection() {
  return (
    <section className="bg-surface px-6 sm:px-12 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionEyebrow>Transparencia total</SectionEyebrow>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary tracking-tight leading-snug mb-3">
          Sin costos escondidos.
        </h2>
        <p className="text-sm sm:text-base font-sans text-text-secondary max-w-lg leading-relaxed">
          La comisión de Singles.ar se descuenta automáticamente del precio de venta. El comprador siempre paga el precio publicado, nada más.
        </p>

        <div className="bg-surface border border-border rounded-2xl p-9 mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: text */}
          <div>
            <h3 className="font-serif text-xl font-semibold text-primary mb-3">¿Cuánto cuesta vender?</h3>
            <p className="text-sm font-sans text-text-secondary leading-relaxed mb-4">
              La única comisión que pagás como vendedor es un porcentaje del precio final de venta, que se descuenta automáticamente al momento del pago.{" "}
              <strong className="text-text-primary">Para el comprador el precio es siempre el publicado.</strong>
            </p>
            <p className="text-sm font-sans text-text-secondary leading-relaxed mb-4">
              El pago se procesa vía MercadoPago, que también aplica su propia comisión. Ambos costos se muestran claramente antes de publicar cualquier listing.
            </p>
            <p className="text-xs font-sans text-text-muted leading-relaxed">
              Registrarse, buscar cartas, chatear con vendedores y crear buy orders es completamente gratis. Solo se cobra comisión cuando una venta se completa.
            </p>
          </div>

          {/* Right: example */}
          <div>
            <div className="text-2xs font-semibold font-sans uppercase tracking-widest text-text-muted mb-3.5">
              Ejemplo — carta de $2.000
            </div>
            <div className="bg-background border border-border rounded-xl p-5">
              {[
                { label: "Precio de venta publicado", val: "$2.000",  style: "neutral" },
                { label: "Comisión Singles.ar (~5%)",  val: "− $100", style: "red"     },
                { label: "Comisión MercadoPago (~4%)", val: "− $80",  style: "red"     },
              ].map(({ label, val, style }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-border text-sm font-sans">
                  <span className="text-text-secondary">{label}</span>
                  <span className={style === "red" ? "font-medium text-error" : "font-medium text-primary"}>
                    {val}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-primary">
                <span className="text-sm font-semibold font-sans text-primary">Recibís en tu MP</span>
                <span className="font-price text-xl font-bold text-success">$1.820</span>
              </div>
            </div>
            <p className="text-2xs font-sans text-text-muted mt-2.5">
              * Los porcentajes exactos se muestran al crear cada listing y pueden variar.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Trust ────────────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  {
    icon: "🔒",
    title: "Dinero retenido hasta la entrega",
    desc:  "El pago se retiene en la plataforma hasta que el comprador confirma que recibió la carta. El vendedor cobra solo cuando vos estás conforme.",
  },
  {
    icon: "👤",
    title: "Identidad anónima",
    desc:  "Tu email y nombre real nunca se exponen. Solo tu apodo público es visible para otros usuarios.",
  },
  {
    icon: "📋",
    title: "Historial completo",
    desc:  "Cada transacción queda registrada. Podés ver el historial completo de cualquier vendedor antes de comprar.",
  },
  {
    icon: "⭐",
    title: "Sistema de reseñas",
    desc:  "Compradores y vendedores se califican mutuamente. Los malos actores pierden reputación rápidamente.",
  },
] as const;

function TrustSection() {
  return (
    <section className="bg-background px-6 sm:px-12 py-20">
      <div className="mx-auto max-w-5xl">
        <SectionEyebrow>Seguridad</SectionEyebrow>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary tracking-tight leading-snug">
          Diseñado para que confíes.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="bg-background border border-border rounded-xl p-6 text-center">
              <div className="text-3xl mb-3">{item.icon}</div>
              <div className="text-sm font-semibold font-sans text-primary mb-1.5">{item.title}</div>
              <div className="text-xs font-sans text-text-secondary leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="bg-primary px-6 sm:px-12 py-20 text-center">
      <div className="mx-auto max-w-lg">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-snug mb-3.5">
          ¿Listo para empezar<br />
          a{" "}
          <em className="not-italic" style={{ color: "#d4a84b" }}>jugar el mercado?</em>
        </h2>
        <p className="text-sm sm:text-base font-sans leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.55)" }}>
          Creá tu cuenta gratis, explorá el catálogo y empezá a comprar o vender hoy mismo.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-white px-7 py-3.5 rounded-lg no-underline transition-all hover:-translate-y-px"
            style={{ background: "#b5862a" }}
          >
            Crear cuenta gratis →
          </Link>
          <Link
            href="/cards"
            className="inline-flex items-center gap-2 font-sans text-sm font-medium text-white px-7 py-3.5 rounded-lg no-underline transition-colors"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Explorar cartas
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <div className="w-5 h-px bg-accent" />
      <span className="text-2xs font-semibold font-sans text-accent uppercase tracking-widest">{children}</span>
    </div>
  );
}
