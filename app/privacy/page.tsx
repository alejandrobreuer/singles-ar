import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Política de Privacidad — CardStash.ar",
  description: "Política de Privacidad y Protección de Datos de CardStash.ar. Vigente desde el 15 de mayo de 2026.",
};

// ─── Section component ────────────────────────────────────────────────────────

function Section({ number, title, children }: { number?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="font-serif text-lg font-semibold text-text-primary mb-3 flex items-start gap-2">
        {number && (
          <span className="shrink-0 inline-flex items-center justify-center size-7 rounded-full bg-primary/10 text-primary text-sm font-bold font-sans mt-0.5">
            {number}
          </span>
        )}
        {title}
      </h2>
      <div className="surface-raised p-5 text-sm font-sans text-text-secondary leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-text-primary mb-1.5">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 pl-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-2 shrink-0 size-1.5 rounded-full bg-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Hero */}
      <section className="bg-primary">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex items-center gap-2 mb-3">
            <span className="block w-5 h-px bg-accent" />
            <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-accent">Legal</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">
            Política de Privacidad
          </h1>
          <p className="text-sm text-white/50 font-sans">
            Versión 1.0 · Vigente desde: 15 de mayo de 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-10">

        <p className="text-sm font-sans text-text-secondary leading-relaxed mb-8 surface-raised p-5">
          La presente Política de Privacidad describe cómo CardStash.ar recopila, utiliza, almacena y protege la información personal de sus usuarios de conformidad con la Ley N° 25.326 de Protección de Datos Personales de la República Argentina y su decreto reglamentario N° 1558/2001. Al registrarte y utilizar CardStash.ar, aceptás las prácticas descritas en esta Política.
        </p>

        <Section number="1" title="Responsable del Tratamiento de Datos">
          <p>El responsable del tratamiento de los datos personales recopilados a través de CardStash.ar es el operador de la Plataforma, domiciliado en la República Argentina. Para consultas relacionadas con el tratamiento de tus datos personales, podés comunicarte a través de los canales de contacto disponibles en cardstash.ar.</p>
        </Section>

        <Section number="2" title="Datos que Recopilamos">
          <SubSection title="2.1 Datos que nos proporcionás directamente">
            <p>Al registrarte y usar la Plataforma, recopilamos:</p>
            <BulletList items={[
              'Dirección de correo electrónico (usada para autenticación y comunicaciones)',
              'Apodo o nombre de usuario público (elegido por vos al registrarte)',
              'Contraseña (almacenada de forma encriptada, nunca en texto plano)',
              'Datos de vinculación con MercadoPago: token de acceso OAuth, ID de usuario (almacenados de forma segura para procesar pagos)',
              'Comentarios y descripciones en listings y publicaciones',
              'Mensajes enviados a través del chat interno de la Plataforma',
              'Calificaciones y reseñas dejadas a otros usuarios',
            ]} />
          </SubSection>
          <SubSection title="2.2 Datos generados por el uso de la Plataforma">
            <p>También recopilamos automáticamente:</p>
            <BulletList items={[
              'Historial de transacciones (compras, ventas y canjes realizados)',
              'Listings publicados y buy orders creados',
              'Wishlist y cartas guardadas',
              'Datos de reputación (puntuación calculada en base a reseñas recibidas)',
              'Fecha y hora de acceso a la Plataforma',
              'Dirección IP y datos del dispositivo (navegador, sistema operativo)',
              'Cookies de sesión necesarias para el funcionamiento de la Plataforma',
            ]} />
          </SubSection>
          <SubSection title="2.3 Datos que NO recopilamos">
            <p>CardStash.ar <strong>NO</strong> almacena:</p>
            <BulletList items={[
              'Números de tarjetas de crédito o débito (procesados exclusivamente por MercadoPago)',
              'Datos bancarios, CBU o alias bancarios',
              'Documentos de identidad (DNI, pasaporte, etc.)',
              'Número de teléfono (a menos que el usuario lo comparta voluntariamente en el chat)',
            ]} />
          </SubSection>
        </Section>

        <Section number="3" title="Cómo Usamos tus Datos">
          <p>Utilizamos tus datos personales para los siguientes fines:</p>
          <BulletList items={[
            'Autenticación y gestión de tu cuenta en la Plataforma',
            'Procesamiento de pagos y transacciones a través de MercadoPago',
            'Mostrar tu perfil público (apodo, reputación, historial de ventas visible)',
            'Enviarte notificaciones relacionadas con tus transacciones, buy orders y wishlist',
            'Enviarte comunicaciones de soporte en respuesta a tus consultas',
            'Calcular y actualizar tu puntuación de reputación',
            'Detectar y prevenir fraudes, abusos o violaciones de los Términos y Condiciones',
            'Cumplir con obligaciones legales aplicables',
            'Mejorar el funcionamiento y la experiencia de uso de la Plataforma',
          ]} />
          <p className="font-medium text-text-primary">CardStash.ar no utiliza tus datos personales para fines publicitarios de terceros ni los vende a ninguna empresa o persona.</p>
        </Section>

        <Section number="4" title="Con Quién Compartimos tus Datos">
          <p>CardStash.ar comparte datos personales únicamente en las siguientes circunstancias:</p>
          <SubSection title="4.1 MercadoPago">
            <p>Para procesar pagos, CardStash.ar utiliza MercadoPago (de Mercado Libre S.R.L.). Al vincular tu cuenta de MercadoPago, autorizás a CardStash.ar a transmitir los datos necesarios para procesar transacciones. MercadoPago tiene sus propias políticas de privacidad disponibles en mercadopago.com.ar.</p>
          </SubSection>
          <SubSection title="4.2 Supabase">
            <p>CardStash.ar utiliza Supabase como proveedor de base de datos y autenticación. Tus datos son almacenados en los servidores de Supabase, que cumple con estándares de seguridad internacionales. Más información en supabase.com/privacy.</p>
          </SubSection>
          <SubSection title="4.3 Vercel">
            <p>La Plataforma está alojada en Vercel. Vercel puede procesar datos de tráfico web como parte del servicio de hosting. Más información en vercel.com/legal/privacy-policy.</p>
          </SubSection>
          <SubSection title="4.4 Autoridades competentes">
            <p>CardStash.ar podrá compartir datos personales con autoridades judiciales o gubernamentales cuando así lo exija la legislación argentina vigente o una orden judicial.</p>
          </SubSection>
          <SubSection title="4.5 Otros usuarios de la Plataforma">
            <p>Cierta información es visible públicamente para otros usuarios: tu apodo (username), tu puntuación de reputación, las reseñas que hayas recibido y tus listings activos.</p>
            <p className="font-medium text-text-primary">Tu dirección de correo electrónico, ID interno, token de MercadoPago y cualquier otro dato sensible NUNCA son visibles para otros usuarios.</p>
          </SubSection>
        </Section>

        <Section number="5" title="Cookies">
          <p>CardStash.ar utiliza cookies estrictamente necesarias para el funcionamiento de la Plataforma:</p>
          <BulletList items={[
            'Cookies de sesión de Supabase: para mantener tu sesión iniciada mientras navegás',
            'Cookies de seguridad: para prevenir ataques CSRF y proteger tu cuenta',
          ]} />
          <p>No utilizamos cookies de rastreo publicitario, cookies de terceros con fines de marketing, ni tecnologías de seguimiento entre sitios.</p>
        </Section>

        <Section number="6" title="Retención de Datos">
          <p>Conservamos tus datos personales durante el tiempo que tu cuenta permanezca activa en la Plataforma. Cuando solicitás la eliminación de tu cuenta:</p>
          <BulletList items={[
            'Tus datos de acceso (email, contraseña) son eliminados inmediatamente',
            'Tu historial de transacciones es anonimizado dentro de los 30 días',
            'Los mensajes del chat son eliminados dentro de los 30 días',
            'Las reseñas que dejaste a otros usuarios pueden mantenerse de forma anonimizada para preservar la integridad del sistema de reputación',
          ]} />
          <p>Podemos retener ciertos datos durante el plazo legalmente exigible cuando existan obligaciones fiscales, contables o legales que así lo requieran.</p>
        </Section>

        <Section number="7" title="Seguridad de los Datos">
          <p>Implementamos las siguientes medidas de seguridad para proteger tus datos:</p>
          <BulletList items={[
            'Encriptación de contraseñas mediante algoritmos seguros (bcrypt)',
            'Comunicaciones cifradas mediante HTTPS/TLS en toda la Plataforma',
            'Tokens de MercadoPago almacenados de forma segura con acceso restringido',
            'Políticas de Row Level Security (RLS) en la base de datos que limitan el acceso por usuario',
            'Acceso administrativo restringido a usuarios autorizados',
          ]} />
          <p>Ningún sistema de seguridad es infalible. En caso de detectar una brecha de seguridad que afecte tus datos, te notificaremos en el menor tiempo posible.</p>
        </Section>

        <Section number="8" title="Tus Derechos como Titular de Datos">
          <p>De conformidad con la Ley N° 25.326, tenés los siguientes derechos respecto de tus datos personales:</p>
          <SubSection title="8.1 Derecho de acceso">
            <p>Podés solicitar en cualquier momento una copia de los datos personales que tenemos sobre vos.</p>
          </SubSection>
          <SubSection title="8.2 Derecho de rectificación">
            <p>Podés solicitar la corrección de datos incorrectos, incompletos o desactualizados. Muchos datos podés actualizarlos directamente desde la configuración de tu cuenta.</p>
          </SubSection>
          <SubSection title="8.3 Derecho de supresión">
            <p>Podés solicitar la eliminación de tu cuenta y tus datos personales, sujeto a las excepciones legales aplicables.</p>
          </SubSection>
          <SubSection title="8.4 Derecho de confidencialidad">
            <p>Tus datos personales son tratados de forma confidencial y no serán cedidos a terceros salvo en los casos expresamente previstos en esta Política.</p>
          </SubSection>
          <SubSection title="8.5 Cómo ejercer tus derechos">
            <p>
              Para ejercer cualquiera de estos derechos, comunicate con nosotros a través de los{" "}
              <Link href="/contact" className="text-primary font-medium hover:text-accent transition-colors no-underline underline decoration-primary/30">
                canales de contacto disponibles en cardstash.ar
              </Link>
              . Responderemos tu solicitud dentro de los plazos establecidos por la Ley N° 25.326.
            </p>
            <p>La Dirección Nacional de Protección de Datos Personales (DNPDP) es el organismo de control competente en Argentina para recibir denuncias relacionadas con el tratamiento de datos personales.</p>
          </SubSection>
        </Section>

        <Section number="9" title="Menores de Edad">
          <p>CardStash.ar no está dirigido a menores de 18 años. No recopilamos intencionalmente datos personales de menores de edad. Si sos menor de 18 años, no uses la Plataforma ni nos proporciones tus datos personales. Si tenemos conocimiento de que hemos recopilado datos de un menor, procederemos a eliminarlos de inmediato.</p>
        </Section>

        <Section number="10" title="Transferencias Internacionales de Datos">
          <p>Los datos personales de los usuarios pueden ser almacenados y procesados en servidores ubicados fuera de Argentina (incluyendo los servidores de Supabase y Vercel). Al utilizar CardStash.ar, aceptás que tus datos puedan ser transferidos a países con leyes de protección de datos diferentes a las de Argentina.</p>
          <p>En todos los casos, procuramos que los proveedores de servicios que utilizamos ofrezcan garantías adecuadas de seguridad y protección.</p>
        </Section>

        <Section number="11" title="Cambios a esta Política">
          <p>Podemos actualizar esta Política de Privacidad en cualquier momento. Cuando realicemos cambios materiales, te notificaremos mediante un aviso en la Plataforma con al menos quince (15) días de anticipación. El uso continuado de la Plataforma después de la fecha de vigencia de los cambios implica la aceptación de la nueva Política.</p>
        </Section>

        <Section number="12" title="Contacto">
          <p>
            Para cualquier consulta, solicitud o reclamo relacionado con el tratamiento de tus datos personales, podés comunicarte con nosotros a través de los{" "}
            <Link href="/contact" className="text-primary font-medium hover:text-accent transition-colors no-underline underline decoration-primary/30">
              canales de contacto disponibles en cardstash.ar
            </Link>
            .
          </p>
        </Section>

        <div className="text-xs text-text-muted font-sans text-center mt-10 pb-2">
          Última actualización: 15 de mayo de 2026 · CardStash.ar · República Argentina
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
