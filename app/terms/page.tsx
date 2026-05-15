import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Términos y Condiciones — CardStash.ar",
  description: "Términos y Condiciones de Uso de CardStash.ar. Versión 1.1, vigente desde el 3 de mayo de 2026.",
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

export default function TermsPage() {
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
            Términos y Condiciones
          </h1>
          <p className="text-sm text-white/50 font-sans">
            Versión 1.1 · Vigente desde: 3 de mayo de 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 py-10">

        <p className="text-sm font-sans text-text-secondary leading-relaxed mb-8 surface-raised p-5">
          El presente documento establece los Términos y Condiciones de Uso (&ldquo;Términos&rdquo;) que regulan el acceso y uso de la plataforma CardStash.ar (&ldquo;la Plataforma&rdquo;), operada desde la República Argentina. Al registrarse o utilizar CardStash.ar, el usuario declara haber leído, comprendido y aceptado en su totalidad estos Términos.
        </p>

        <Section number="1" title="Definiciones">
          <p>A los efectos del presente documento, se entiende por:</p>
          <BulletList items={[
            '"Plataforma": El sitio web CardStash.ar y todos sus servicios asociados.',
            '"Operador": La persona humana o jurídica responsable de la administración técnica de CardStash.ar.',
            '"Usuario": Toda persona física o jurídica que acceda, navegue o utilice la Plataforma, ya sea en carácter de Comprador, Vendedor o ambos.',
            '"Vendedor": Usuario que publica uno o más listings de cartas TCG en la Plataforma.',
            '"Comprador": Usuario que adquiere o intenta adquirir una carta publicada en la Plataforma.',
            '"Listing": Publicación realizada por un Vendedor en la que se ofrece una carta TCG a un precio determinado o como canje.',
            '"Buy Order": Oferta de compra publicada por un Usuario que expresa su intención de adquirir una carta a un precio máximo determinado.',
            '"Transacción": El proceso completo que comprende la aceptación de un Listing o Buy Order, el pago, la entrega y la confirmación entre Comprador y Vendedor.',
            'Trading Card Games: Juego de Cartas coleccionables.',
          ]} />
        </Section>

        <Section number="2" title="Naturaleza del Servicio — Plataforma Intermediaria">
          <p>CardStash.ar es una plataforma de comercio electrónico en la cual los Vendedores podrán publicar, bajo sus condiciones y exclusiva responsabilidad, ofertas de venta de productos.</p>
          <p>CardStash.ar es exclusivamente una plataforma de intermediación tecnológica. Su rol es meramente técnico, pasivo y neutral. CardStash.ar no posee control sobre las publicaciones de los Vendedores ni su contenido, no respalda, avala ni garantiza sus ofertas, productos ni condiciones de venta.</p>
          <p>CardStash.ar no es parte en ninguna transacción entre Usuarios, no actúa como Vendedor, Comprador, Agente, Corredor ni representante de ninguna de las partes involucradas en la Transacción.</p>
          <p className="font-medium text-text-primary">CardStash.ar pone a disposición de sus Usuarios:</p>
          <BulletList items={[
            'La publicación de listings de cartas coleccionables TCG (Trading Card Games).',
            'Encontrar oportunidades de concretar una Transacción.',
            'Un sistema de mensajería interna entre las partes de una Transacción activa.',
            'Un sistema de reputación basado en calificaciones voluntarias post-transacción.',
          ]} />
          <p className="font-medium text-text-primary">En su rol de intermediario, CardStash.ar NO:</p>
          <BulletList items={[
            'Verifica la autenticidad, condición, originalidad ni calidad de los productos publicados.',
            'Garantiza la exactitud de las descripciones realizadas por los Vendedores.',
            'Interviene en la negociación, entrega física ni en el acuerdo de condiciones entre las partes.',
            'Actúa como depositario de los productos ni asume responsabilidad por su custodia.',
            'Garantiza la solvencia, identidad real ni conducta futura de ningún Usuario.',
          ]} />
        </Section>

        <Section number="3" title="Registro y Cuenta de Usuario">
          <SubSection title="3.1 Requisitos de registro">
            <p>Para utilizar las funcionalidades de la Plataforma, el Usuario deberá crear una cuenta proporcionando una dirección de correo electrónico válida y una contraseña. El Usuario elegirá un apodo público (&ldquo;username&rdquo;) que será el único identificador visible para otros Usuarios. Los datos personales del Usuario, incluyendo su dirección de correo electrónico, nunca serán visibles para terceros dentro de la Plataforma.</p>
          </SubSection>
          <SubSection title="3.2 Responsabilidad sobre la cuenta">
            <p>El Usuario es el único responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades realizadas desde su cuenta. Ante cualquier acceso no autorizado, deberá notificarlo inmediatamente al Operador. CardStash.ar no será responsable por daños o pérdidas derivadas del uso no autorizado de credenciales por negligencia del Usuario.</p>
          </SubSection>
          <SubSection title="3.3 Datos Personales">
            <p>Al registrarse y crear una cuenta en la Plataforma, el Usuario presta su consentimiento expreso, libre e informado para que CardStash.ar recolecte, almacene y trate sus datos personales conforme a la Ley N° 25.326.</p>
            <p>Los datos recolectados tendrán como finalidad exclusiva: validar la identidad del Usuario, facilitar la concreción de transacciones y enviar comunicaciones relacionadas con el servicio.</p>
            <p>El Usuario tiene derecho a ejercer los derechos de Acceso, Rectificación, Actualización y Supresión de sus datos. Para ejercer estos derechos, puede comunicarse a través de los canales de contacto disponibles en la Plataforma.</p>
          </SubSection>
        </Section>

        <Section number="4" title="Publicaciones y Listings">
          <SubSection title="4.1 Contenido de las publicaciones">
            <p>El Vendedor es el único responsable del contenido, descripción, precio y demás características de cada listing que publique. Al publicar un producto, el Vendedor declara ser el legítimo propietario, que el producto es auténtico y que la descripción de su estado es fiel a su condición real.</p>
          </SubSection>
          <SubSection title="4.2 Límites de precio">
            <p>La Plataforma podrá establecer rangos de precio mínimo y máximo orientativos para evitar publicaciones manifiestamente erróneas o abusivas. El precio final de un producto publicado en la Plataforma es decisión exclusiva del Vendedor.</p>
          </SubSection>
          <SubSection title="4.3 Productos prohibidos">
            <p>Queda prohibida la publicación de productos que constituyan falsificaciones, reproducciones no autorizadas, proxies destinadas a engañar, o que hayan sido obtenidas mediante actividades ilícitas. El Operador se reserva el derecho de proceder a la baja de publicaciones que incumplan con los Términos y Condiciones.</p>
          </SubSection>
        </Section>

        <Section number="5" title="Proceso de Transacción">
          <SubSection title="5.1 Flujo general">
            <BulletList items={[
              'El Comprador selecciona un listing y realiza el pago correspondiente a través de MercadoPago.',
              'Una vez confirmado el pago, la Plataforma habilita el chat entre las partes para coordinar la entrega.',
              'El Vendedor entrega el producto al Comprador según lo acordado.',
              'El Comprador confirma la recepción conforme en la Plataforma.',
              'Una vez confirmada la entrega, el monto se acredita en la cuenta del Vendedor, deducida la comisión de la Plataforma.',
            ]} />
          </SubSection>
          <SubSection title="5.2 Retención del pago">
            <p>El pago realizado por el Comprador permanece retenido en la Plataforma hasta que el Comprador confirme la recepción satisfactoria de la carta. Este mecanismo tiene como único propósito facilitar la coordinación entre las partes y no constituye una garantía, seguro ni escrow bancario regulado.</p>
          </SubSection>
          <SubSection title="5.3 Responsabilidad en la entrega">
            <p>La entrega física de las cartas es responsabilidad exclusiva de las partes involucradas en la transacción. CardStash.ar no interviene en la coordinación logística ni garantiza la correcta ejecución de la entrega. Cualquier disputa relacionada con la entrega deberá ser resuelta directamente entre el Comprador y el Vendedor.</p>
          </SubSection>
        </Section>

        <Section number="6" title="Buy Orders">
          <p>Los Usuarios podrán publicar ofertas de compra (&ldquo;Buy Orders&rdquo;) indicando el precio máximo que están dispuestos a pagar por una carta determinada. Los Buy Orders tienen vigencia temporal limitada y se eliminan automáticamente al vencimiento del plazo seleccionado.</p>
          <p>El Usuario que cancele un Buy Order previamente aceptado por un Vendedor sin causa justificada podrá recibir una penalización en su reputación. La reiteración de cancelaciones injustificadas podrá resultar en la suspensión temporal o permanente de la cuenta.</p>
        </Section>

        <Section number="7" title="Comisiones y Pagos">
          <p>CardStash.ar cobra una comisión sobre el precio de venta de cada transacción completada. Dicha comisión es informada al Vendedor de forma clara y transparente antes de publicar cada listing. La comisión se deduce automáticamente al momento de la acreditación del pago.</p>
          <p>Las comisiones abonadas no son reembolsables salvo en los casos expresamente previstos en estos Términos y Condiciones.</p>
        </Section>

        <Section number="8" title="Limitación de Responsabilidad del Operador">
          <p>CardStash.ar actúa exclusivamente como facilitador tecnológico de encuentro entre partes. El Operador no asume ninguna responsabilidad por conductas fraudulentas de los Usuarios, ni por los daños o perjuicios que pudieran derivarse de las transacciones realizadas entre Usuarios.</p>
          <p>En particular, CardStash.ar no será responsable por:</p>
          <BulletList items={[
            'El contenido de las Publicaciones de los Vendedores.',
            'La autenticidad, originalidad, condición real ni valor de los productos comercializados.',
            'Conductas fraudulentas, engañosas o dolosas de cualquier Usuario.',
            'Daños directos, indirectos, incidentales, especiales o consecuentes derivados del uso de la Plataforma.',
            'Disputas entre Compradores y Vendedores respecto al estado, autenticidad o entrega de los productos.',
            'Pérdidas económicas derivadas de fluctuaciones de precios u otros factores de mercado.',
          ]} />
        </Section>

        <Section number="9" title="Obligaciones y Conducta de los Usuarios">
          <SubSection title="9.1 Conducta general">
            <p>Los Usuarios se comprometen a:</p>
            <BulletList items={[
              'Utilizar la Plataforma únicamente para los fines previstos en estos Términos.',
              'Proporcionar información veraz, actualizada y completa en sus publicaciones.',
              'No publicar productos falsificados, robados u obtenidos por medios ilícitos.',
              'No utilizar la Plataforma para evadir el pago de comisiones.',
              'No compartir datos de contacto personal para eludir el sistema de pago de la Plataforma.',
              'No realizar conductas que puedan dañar la reputación o el funcionamiento de la Plataforma.',
              'Respetar las leyes argentinas aplicables a la compraventa de bienes.',
            ]} />
          </SubSection>
          <SubSection title="9.2 Conducta prohibida específica">
            <p>Queda expresamente prohibido:</p>
            <BulletList items={[
              'Utilizar robots, scrapers, crawlers o scripts automatizados para acceder o extraer contenido sin autorización.',
              'Intentar eludir, desactivar o interferir con los sistemas de seguridad de la Plataforma.',
              'Publicar listados ficticios o realizar transacciones simuladas para manipular precios o reputación.',
              'Utilizar la cuenta de otro Usuario o suplantar la identidad de cualquier persona.',
              'Reproducir, distribuir o explotar comercialmente el contenido de la Plataforma sin autorización.',
              'Transmitir virus, malware u otro código malicioso a través de la Plataforma.',
              'Acosar, intimidar o amenazar a otros Usuarios en relación con transacciones.',
            ]} />
          </SubSection>
        </Section>

        <Section number="10" title="Sistema de Reputación y Reseñas">
          <p>La Plataforma cuenta con un sistema de calificaciones y reseñas entre Usuarios. Dichas calificaciones son expresión de la opinión personal de cada Usuario y no constituyen declaraciones ni avales del Operador.</p>
          <p>CardStash.ar no verifica la veracidad ni autenticidad de las reseñas publicadas y no será responsable por las consecuencias derivadas de calificaciones falsas o malintencionadas. El Operador se reserva el derecho de eliminar reseñas abusivas, falsas o difamatorias.</p>
        </Section>

        <Section number="11" title="Contenido Generado por Usuarios">
          <p>Los Usuarios retienen la titularidad sobre el contenido que publican en la Plataforma. Al publicar dicho contenido, el Usuario otorga al Operador una licencia no exclusiva, gratuita y mundial para usar, reproducir y distribuir ese contenido en la medida necesaria para la operación de la Plataforma.</p>
          <p>El Usuario declara que es titular de los derechos sobre el contenido que publica, que no infringe derechos de terceros y que no es falso, engañoso ni difamatorio.</p>
        </Section>

        <Section number="12" title="Chargebacks y Disputas de Pago">
          <p>En caso de que un Comprador inicie un contracargo (&ldquo;chargeback&rdquo;) o disputa de pago, el Operador colaborará con el Proveedor de Servicios de Pago en la medida de sus posibilidades, pero no garantiza la resolución favorable para ninguna de las partes.</p>
          <p>El Usuario que inicie un chargeback de forma fraudulenta habiendo recibido el producto y confirmado la entrega podrá ser suspendido de forma permanente, y el Operador se reserva el derecho de ejercer las acciones legales correspondientes.</p>
        </Section>

        <Section number="13" title="Propiedad Intelectual">
          <p>Todos los derechos de propiedad intelectual sobre la Plataforma, incluyendo código fuente, diseño gráfico, interfaces, logotipos, marcas, textos, algoritmos y bases de datos, son propiedad exclusiva de CardStash.ar o de sus licenciantes, y están protegidos por las leyes nacionales de propiedad intelectual.</p>
          <p>Si cualquier persona considera que un contenido en la Plataforma infringe sus derechos de propiedad intelectual, deberá notificarlo a través de los canales de contacto disponibles en la Plataforma.</p>
        </Section>

        <Section number="15" title="Privacidad y Protección de Datos">
          <p>
            El tratamiento de datos personales de los Usuarios se rige por la{" "}
            <Link href="/privacy" className="text-primary font-medium hover:text-accent transition-colors no-underline underline decoration-primary/30">
              Política de Privacidad de CardStash.ar
            </Link>
            , disponible en la Plataforma, y por las disposiciones de la Ley N° 25.326 de Protección de Datos Personales de la República Argentina.
          </p>
        </Section>

        <Section number="16" title="Modificaciones a los Términos">
          <p>El Operador se reserva el derecho de modificar estos Términos en cualquier momento. Las modificaciones serán notificadas a los Usuarios mediante publicación en la Plataforma con al menos quince (15) días de anticipación a su entrada en vigencia. El uso continuado de la Plataforma implica la aceptación de los nuevos Términos.</p>
        </Section>

        <Section number="17" title="Suspensión y Cancelación de Cuentas">
          <p>El Operador podrá suspender o cancelar la cuenta de un Usuario, de forma temporal o permanente, en los siguientes casos:</p>
          <BulletList items={[
            'Incumplimiento de estos Términos y Condiciones o de la legislación vigente.',
            'Conductas fraudulentas o sospechosas de fraude.',
            'Publicación de productos falsificados, robados o de origen ilícito.',
            'Uso de bots, scrapers o herramientas automatizadas no autorizadas.',
            'Manipulación del sistema de precios o reputación.',
            'Reiteración de cancelaciones injustificadas de transacciones o buy orders.',
            'Evasión del sistema de comisiones de la Plataforma.',
            'Chargebacks fraudulentos o injustificados.',
            'A solicitud de autoridad judicial o administrativa competente.',
          ]} />
          <p>La cancelación de una cuenta no exime al Usuario de las obligaciones contraídas previamente.</p>
        </Section>

        <Section number="18" title="Fuerza Mayor e Interrupciones del Servicio">
          <p>El Operador no será responsable por el incumplimiento de sus obligaciones cuando dicho incumplimiento se deba a causas fuera de su control razonable, incluyendo fallas en servicios de terceros, cortes de energía, fallas de infraestructura de Internet, cambios regulatorios, desastres naturales o actos de gobierno.</p>
        </Section>

        <Section number="19" title="Legislación Aplicable y Jurisdicción">
          <p>Estos Términos se rigen por las leyes de la República Argentina. Para cualquier controversia derivada de la interpretación, aplicación o incumplimiento de estos Términos, las partes se someten a la jurisdicción de los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires, con renuncia expresa a cualquier otro fuero que pudiera corresponder.</p>
        </Section>

        <Section number="20" title="Contacto">
          <p>
            Para consultas, reclamos o notificaciones relacionadas con estos Términos, el Usuario podrá comunicarse con el Operador a través de los{" "}
            <Link href="/contact" className="text-primary font-medium hover:text-accent transition-colors no-underline underline decoration-primary/30">
              canales de contacto disponibles en la Plataforma
            </Link>
            .
          </p>
        </Section>

        <div className="text-xs text-text-muted font-sans text-center mt-10 pb-2">
          Última actualización: 3 de mayo de 2026 · CardStash.ar · República Argentina
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
