// CardStash.ar — Document generator  (docx 9.x safe)
// Run: node docs/generate.mjs
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, SimpleField, AlignmentType, BorderStyle, WidthType,
  HeadingLevel, LevelFormat, convertInchesToTwip,
  ShadingType, TableLayoutType, VerticalAlign, UnderlineType, LineRuleType,
} from "docx";
import { writeFileSync } from "fs";

// ─── Palette ──────────────────────────────────────────────────────────────────
const NAVY  = "1A2744";
const SLATE = "4A5578";
const BODY  = "1A2030";
const WHITE = "FFFFFF";
const GREY  = "8A96B0";
const LIGHT = "F1F3F8";

// ─── Base run ─────────────────────────────────────────────────────────────────
function r(text, opts = {}) {
  return new TextRun({
    text,
    font:    "Arial",
    color:   opts.color   ?? BODY,
    size:    opts.size    ?? 24,
    bold:    opts.bold    ?? false,
    italics: opts.italics ?? false,
  });
}

// ─── Paragraph helpers ────────────────────────────────────────────────────────
function p(text, opts = {}) {
  const children = typeof text === "string" ? [r(text, opts)] : text;
  return new Paragraph({
    children,
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    spacing:   { line: 276, lineRule: LineRuleType.AUTO, before: opts.before ?? 80, after: opts.after ?? 80 },
    indent:    opts.indent ? { left: convertInchesToTwip(0.5) } : undefined,
  });
}

function pageBreak() {
  return new Paragraph({ children: [new TextRun({ break: 1 })], spacing: { before: 0, after: 0 } });
}

function h1(text) {
  return new Paragraph({
    children: [r(text, { color: NAVY, size: 48, bold: true })],
    heading:  HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    spacing: { before: 0, after: 200 },
  });
}

function h2(text) {
  return new Paragraph({
    children: [r(text, { color: NAVY, size: 36, bold: true })],
    heading:  HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
  });
}

function h3(text) {
  return new Paragraph({
    children: [r(text, { color: NAVY, size: 28, bold: true })],
    heading:  HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
  });
}

function bullet(text) {
  return new Paragraph({
    children: [r(text)],
    numbering: { reference: "cardstash-bullets", level: 0 },
    spacing:   { line: 276, lineRule: LineRuleType.AUTO, before: 40, after: 40 },
  });
}

function callout(text, warn = false) {
  return new Paragraph({
    children: [r((warn ? "IMPORTANTE: " : "") + text, { italics: true, color: SLATE })],
    border:   { left: { color: NAVY, size: 18, space: 4, style: BorderStyle.SINGLE } },
    indent:   { left: convertInchesToTwip(0.5) },
    spacing:  { before: 120, after: 120, line: 276, lineRule: LineRuleType.AUTO },
  });
}

function gap() {
  return new Paragraph({ children: [r("")], spacing: { before: 0, after: 0 } });
}

// ─── Table helpers ─────────────────────────────────────────────────────────────
function th(text) {
  return new TableCell({
    children: [new Paragraph({
      children: [r(text, { color: WHITE, size: 22, bold: true })],
      spacing: { before: 60, after: 60 },
    })],
    shading: { fill: NAVY, type: ShadingType.CLEAR, color: NAVY },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  });
}

function td(text, shade = false) {
  return new TableCell({
    children: [new Paragraph({
      children: [r(text, { size: 22 })],
      spacing: { before: 60, after: 60 },
    })],
    shading: shade ? { fill: LIGHT, type: ShadingType.CLEAR, color: LIGHT } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.TOP,
  });
}

function table(headers, rows) {
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ children: headers.map(th), tableHeader: true }),
      ...rows.map((cells, ri) =>
        new TableRow({ children: cells.map((c, ci) => td(c, ri % 2 === 1)) })
      ),
    ],
  });
}

// ─── Numbering ────────────────────────────────────────────────────────────────
const numbering = {
  config: [{
    reference: "cardstash-bullets",
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text: "•",
      alignment: AlignmentType.LEFT,
      style: {
        paragraph: {
          indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
        },
      },
    }],
  }],
};

// ─── Header / Footer ──────────────────────────────────────────────────────────
const docHeader = new Header({
  children: [new Paragraph({
    children: [r("CardStash.ar — Documentación del Proyecto", { color: GREY, size: 18 })],
    border:    { bottom: { color: GREY, size: 6, space: 4, style: BorderStyle.SINGLE } },
    spacing:   { after: 100 },
    alignment: AlignmentType.LEFT,
  })],
});

const docFooter = new Footer({
  children: [new Paragraph({
    children: [
      r("Página ", { color: GREY, size: 18 }),
      new SimpleField("PAGE"),
    ],
    alignment: AlignmentType.RIGHT,
    border:    { top: { color: GREY, size: 6, space: 4, style: BorderStyle.SINGLE } },
    spacing:   { before: 100 },
  })],
});

// =============================================================================
// CONTENT
// =============================================================================

// ─── PORTADA ──────────────────────────────────────────────────────────────────
const cover = [
  gap(), gap(), gap(), gap(), gap(), gap(), gap(),
  new Paragraph({
    children: [r("CardStash.ar", { color: NAVY, size: 72, bold: true })],
    alignment: AlignmentType.CENTER, spacing: { after: 160 },
  }),
  new Paragraph({
    children: [r("Documentación del Proyecto", { color: NAVY, size: 44, bold: true })],
    alignment: AlignmentType.CENTER, spacing: { after: 120 },
  }),
  new Paragraph({
    children: [r("Guía completa del sistema — versión 1.0", { color: SLATE, size: 32 })],
    alignment: AlignmentType.CENTER, spacing: { after: 200 },
  }),
  new Paragraph({
    children: [r("Mayo 2026", { color: SLATE, size: 24 })],
    alignment: AlignmentType.CENTER, spacing: { after: 480 },
  }),
  new Paragraph({
    children: [r("Este documento describe en detalle qué es CardStash.ar, cómo funciona para compradores y vendedores, cómo está construido técnicamente, y cómo mantenerlo y expandirlo. Está pensado para que cualquier persona —con o sin experiencia técnica— pueda entender la plataforma, y para que cualquier desarrollador que se sume al equipo pueda orientarse rápidamente.", { size: 24 })],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 0, after: 0, line: 276, lineRule: LineRuleType.AUTO },
    indent: { left: convertInchesToTwip(1), right: convertInchesToTwip(1) },
  }),
];

// ─── ÍNDICE ───────────────────────────────────────────────────────────────────
const toc = [
  new Paragraph({
    children: [r("Índice de Contenidos", { color: NAVY, size: 48, bold: true })],
    pageBreakBefore: true,
    spacing: { before: 0, after: 320 },
  }),
  ...[
    "SECCIÓN 1 — ¿Qué es CardStash.ar?",
    "SECCIÓN 2 — Cómo funciona la plataforma",
    "SECCIÓN 3 — Estructura técnica del proyecto",
    "SECCIÓN 4 — Base de datos",
    "SECCIÓN 5 — Integraciones externas",
    "SECCIÓN 6 — Flujos de pago detallados",
    "SECCIÓN 7 — Panel de administración",
    "SECCIÓN 8 — Despliegue y mantenimiento",
    "SECCIÓN 9 — Documentos legales",
    "SECCIÓN 10 — Glosario",
    "Apéndice — Contactos y recursos",
  ].map(s => p(s, { before: 60, after: 60 })),
];

// ─── SECCIÓN 1 ───────────────────────────────────────────────────────────────
const s1 = [
  h1("SECCIÓN 1 — ¿Qué es CardStash.ar?"),
  p("Esta sección explica qué hace la plataforma, para quién está pensada y qué problema resuelve en el mercado argentino de cartas coleccionables."),
  gap(),
  p("CardStash.ar es un marketplace (tienda virtual) de persona a persona (P2P) para comprar y vender cartas de juegos de cartas coleccionables (TCG) en Argentina. Permite que cualquier persona publique cartas que quiere vender, que otras personas las encuentren y las compren, y que el pago se procese de forma segura mediante MercadoPago."),
  gap(),
  h2("Para qué sirve y quién la usa"),
  p("La plataforma está pensada para jugadores de Magic: The Gathering, Pokémon y One Piece que quieren comprar o vender cartas en Argentina. Tanto compradores ocasionales como vendedores frecuentes pueden usarla."),
  gap(),
  h2("El problema que resuelve"),
  p("Antes de CardStash.ar, los jugadores argentinos compraban y vendían cartas principalmente por grupos de Facebook y chats de WhatsApp. Ese sistema tiene problemas serios:"),
  bullet("Los precios son inconsistentes: cada vendedor pone lo que quiere sin referencia"),
  bullet("Los pagos son inseguros: transferencias bancarias que pueden no llegar"),
  bullet("No hay historial de reputación: es imposible saber si un vendedor es confiable"),
  bullet("Las cartas son difíciles de encontrar: no hay búsqueda, solo scrollear publicaciones"),
  gap(),
  h2("Cómo es diferente a grupos de Facebook"),
  bullet("Pagos seguros vía MercadoPago: el dinero está protegido durante la operación"),
  bullet("Sistema de reputación: cada vendedor tiene un puntaje basado en transacciones reales"),
  bullet("Precios de referencia: el sistema muestra precios históricos para orientar al comprador"),
  bullet("Búsqueda estructurada: se puede buscar por nombre de carta, juego, condición y precio"),
  bullet("Chat integrado: la comunicación queda dentro de la plataforma"),
  gap(),
  h2("Juegos soportados al lanzamiento"),
  bullet("Magic: The Gathering"),
  bullet("Pokémon TCG"),
  bullet("One Piece Card Game"),
];

// ─── SECCIÓN 2 ───────────────────────────────────────────────────────────────
const s2 = [
  h1("SECCIÓN 2 — Cómo funciona la plataforma"),
  p("Esta sección describe paso a paso cómo interactúan compradores y vendedores, incluyendo los flujos principales de compra-venta."),

  h2("2.1 Flujo del comprador"),
  bullet("Paso 1 — Búsqueda: El comprador busca una carta por nombre en el catálogo."),
  bullet("Paso 2 — Ver publicación: El comprador ve el detalle: descripción, condición, precio y reputación del vendedor."),
  bullet("Paso 3 — Iniciar compra: El comprador hace clic en Comprar. El sistema crea una transacción y abre el chat."),
  bullet("Paso 4 — Chat: El comprador y el vendedor acuerdan detalles de entrega."),
  bullet("Paso 5 — Pago: El comprador hace clic en Pagar. Se lo redirige a MercadoPago Checkout Pro."),
  bullet("Paso 6 — Entrega: El vendedor envía o entrega la carta en persona."),
  bullet("Paso 7 — Confirmación: El comprador confirma que recibió la carta correctamente."),
  bullet("Paso 8 — Reseña: Ambas partes pueden dejar una calificación."),
  gap(),

  h2("2.2 Flujo del vendedor"),
  bullet("Paso 1 — Registro: El vendedor se registra con email y contraseña y elige un apodo."),
  bullet("Paso 2 — Vincular MercadoPago: El vendedor conecta su cuenta de MP desde el perfil. Obligatorio para cobrar."),
  bullet("Paso 3 — Publicar carta: El vendedor crea una publicación con precio, condición y notas."),
  bullet("Paso 4 — Recibir comprador: Cuando un comprador inicia una compra, aparece una notificación."),
  bullet("Paso 5 — Coordinar entrega: El vendedor coordina por chat cómo y cuándo entregar."),
  bullet("Paso 6 — Confirmar envío: El vendedor marca la carta como enviada."),
  bullet("Paso 7 — Cobro: Después de confirmación o de 72 horas, el dinero queda disponible en su cuenta MP."),
  gap(),

  h2("2.3 Sistema de Buy Orders"),
  p("Un Buy Order (orden de compra) es una publicación que hace un comprador diciendo que quiere comprar una carta a un precio determinado. En vez de que el comprador busque al vendedor, el vendedor busca al comprador."),
  gap(),
  bullet("El comprador publica un Buy Order: 'Pago $2.000 por esta carta en condición Near Mint'"),
  bullet("El Buy Order aparece en el catálogo visible para todos los vendedores"),
  bullet("Un vendedor interesado hace clic en Aceptar"),
  bullet("El sistema verifica que el vendedor tenga MercadoPago conectado y reserva el Buy Order"),
  bullet("Se abre un chat entre comprador y vendedor"),
  bullet("El comprador tiene 24 horas para confirmar o rechazar la operación"),
  bullet("Si confirma, paga por MercadoPago Checkout Pro"),
  bullet("Si rechaza o no responde en 24 horas, el Buy Order vuelve a estar disponible"),
  gap(),
  callout("Un Buy Order puede tener una fecha de vencimiento (por defecto 30 días). Si nadie lo acepta en ese tiempo, se cancela automáticamente."),

  h2("2.4 Ventana de 72 horas"),
  p("La ventana de 72 horas es un período de espera después del pago durante el cual el comprador puede verificar que recibió la carta en las condiciones acordadas."),
  bullet("El pago ya fue procesado por MercadoPago: el dinero existe y está asegurado"),
  bullet("El comprador puede confirmar la recepción en cualquier momento"),
  bullet("Si hay un problema, el comprador puede abrir una disputa"),
  bullet("Si pasan 72 horas sin acción, la transacción se completa automáticamente"),
  gap(),
  callout("IMPORTANTE: La ventana de 72 horas es una restricción a nivel de la plataforma CardStash.ar, no de MercadoPago. MP procesa el pago de inmediato; la plataforma controla cuándo se considera liberado para el vendedor.", true),

  h2("2.5 Sistema de reputación"),
  p("La reputación es un puntaje del 0 al 100 que tiene cada usuario. Después de cada transacción, ambas partes pueden dejar una reseña con una calificación. El sistema promedia esas calificaciones ponderadas por cantidad de operaciones."),
  bullet("Top Vendedor: Se asigna automáticamente a vendedores con alto puntaje y muchas ventas completadas."),
  bullet("Comprador poco confiable: Se asigna a compradores que cancelen operaciones repetidamente."),
];

// ─── SECCIÓN 3 ───────────────────────────────────────────────────────────────
const s3 = [
  h1("SECCIÓN 3 — Estructura técnica del proyecto"),
  p("Esta sección describe las tecnologías usadas, cómo está organizado el código fuente, y qué variables de configuración necesita el sistema."),

  h2("3.1 Stack tecnológico"),
  table(
    ["Tecnología", "Para qué se usa", "Por qué se eligió"],
    [
      ["Next.js 14", "Framework principal: maneja las páginas del sitio y los endpoints del servidor", "Frontend y backend en un solo proyecto. Excelente para SEO gracias al renderizado del lado del servidor."],
      ["Supabase", "Base de datos (PostgreSQL), autenticación de usuarios y actualizaciones en tiempo real", "Gratuito, código abierto. Incluye autenticación y WebSockets sin configuración adicional."],
      ["MercadoPago", "Procesamiento de pagos y cobros a vendedores", "Líder del mercado en Argentina. Permite split payments mediante la API de Marketplace."],
      ["Vercel", "Hosting y deployment automático", "Integración nativa con Next.js. Publica automáticamente cada vez que se hace push a GitHub."],
      ["TypeScript", "Lenguaje de programación (JavaScript con tipos)", "El tipado estático previene muchos errores antes de que el código llegue a producción."],
      ["Tailwind CSS", "Estilos visuales", "Se escriben los estilos directamente en el HTML, lo que hace el desarrollo más rápido."],
    ]
  ),
  gap(),

  h2("3.2 Estructura de carpetas"),
  table(
    ["Carpeta", "Qué contiene"],
    [
      ["/app", "Todas las páginas y rutas del sitio. Cada subcarpeta es una URL."],
      ["/app/api", "Los endpoints del servidor (API routes): código que corre en el servidor, no en el navegador."],
      ["/app/(auth)", "Páginas de autenticación: registro, login, onboarding."],
      ["/app/admin", "Panel de administración, solo accesible para administradores."],
      ["/app/cards", "Páginas del catálogo de cartas."],
      ["/app/chat", "Interfaz del sistema de chat entre compradores y vendedores."],
      ["/app/profile", "Perfil de usuario: historial, publicaciones, buy orders."],
      ["/components", "Componentes reutilizables de interfaz que se usan en múltiples páginas."],
      ["/lib", "Funciones de utilidad y lógica reutilizable."],
      ["/lib/supabase", "Clientes de conexión a la base de datos."],
      ["/lib/mercadopago", "Configuración e integración con la API de MercadoPago."],
      ["/types", "Definiciones de tipos TypeScript."],
      ["/supabase/migrations", "Archivos SQL numerados con cambios históricos a la base de datos."],
      ["/docs", "Documentación del proyecto (este archivo y otros)."],
      ["/public", "Imágenes, íconos y archivos estáticos accesibles públicamente."],
    ]
  ),
  gap(),

  h2("3.3 Variables de entorno"),
  callout("IMPORTANTE: Nunca subir el archivo .env.local a GitHub ni compartir estas claves por chat.", true),
  gap(),
  table(
    ["Variable", "Para qué sirve", "Dónde obtenerla", "¿Sensible?"],
    [
      ["NEXT_PUBLIC_SUPABASE_URL", "URL del proyecto Supabase", "Dashboard Supabase → Project Settings → API", "No"],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Clave pública de Supabase para el navegador", "Dashboard Supabase → Project Settings → API", "No"],
      ["SUPABASE_SERVICE_ROLE_KEY", "Clave de administrador Supabase (bypasa todas las restricciones)", "Dashboard Supabase → Project Settings → API", "SÍ — crítica"],
      ["MP_CLIENT_ID", "ID de la aplicación en MercadoPago", "Dashboard MP Developers → Mis apps", "No"],
      ["MP_CLIENT_SECRET", "Secreto de la app MP para intercambio de tokens OAuth", "Dashboard MP Developers → Mis apps", "SÍ"],
      ["MP_PUBLIC_KEY", "Clave pública de MP para el frontend", "Dashboard MP Developers → Mis apps", "No"],
      ["MP_ACCESS_TOKEN", "Token de acceso de la cuenta plataforma MP", "Dashboard MP Developers → Mis apps", "SÍ — crítica"],
      ["NEXT_PUBLIC_APP_URL", "URL pública del sitio (https://cardstash.ar en prod)", "Se configura manualmente", "No"],
      ["CRON_SECRET", "Clave para proteger los endpoints de cron jobs", "Generada manualmente", "SÍ"],
      ["ADMIN_USER_IDS", "UUIDs de Supabase de los usuarios administradores", "Dashboard Supabase → Authentication → Users", "Sí"],
      ["MP_WEBHOOK_SECRET", "Secreto para verificar que los webhooks vienen de MP", "Dashboard MP Developers → Webhooks", "SÍ"],
    ]
  ),
];

// ─── SECCIÓN 4 ───────────────────────────────────────────────────────────────
const s4 = [
  h1("SECCIÓN 4 — Base de datos"),
  p("Esta sección describe dónde y cómo se almacena toda la información de la plataforma, qué tablas existen y cómo se relacionan entre sí."),

  h2("4.1 Visión general"),
  p("Una base de datos es como una planilla de Excel muy avanzada: guarda información organizada en tablas. CardStash.ar usa PostgreSQL a través de Supabase. Supabase agrega autenticación, un sistema de seguridad (RLS — Row Level Security) y actualizaciones en tiempo real."),

  h2("4.2 Tablas principales"),

  h3("profiles — Perfiles de usuario"),
  p("Guarda la información de cada usuario registrado en la plataforma."),
  table(["Columna", "Qué guarda"], [
    ["id", "Identificador único del usuario (UUID)"],
    ["username", "El apodo visible del usuario en la plataforma"],
    ["reputation_score", "Puntaje de reputación del 0 al 100"],
    ["total_sales / total_purchases", "Contadores de ventas y compras completadas"],
    ["mercadopago_access_token", "Token OAuth del vendedor para crear preferencias de pago en su nombre"],
    ["is_reliable_buyer", "Si el comprador tiene buena conducta de pago"],
    ["cancel_count", "Cantidad de cancelaciones recientes"],
  ]),
  gap(),

  h3("cards — Catálogo de cartas"),
  p("Contiene todas las cartas sincronizadas desde APIs externas."),
  table(["Columna", "Qué guarda"], [
    ["external_id", "ID de la carta en la API de origen"],
    ["game", "Juego al que pertenece: magic, pokemon, onepiece"],
    ["name", "Nombre de la carta"],
    ["set_name / set_code", "Nombre y código de la expansión"],
    ["image_url", "URL de la imagen en la API de origen"],
    ["image_override_url", "URL de imagen alternativa configurada por el administrador (tiene prioridad)"],
  ]),
  gap(),

  h3("listings — Publicaciones de venta"),
  p("Cada registro es una oferta de venta publicada por un vendedor."),
  table(["Columna", "Qué guarda"], [
    ["seller_id", "Referencia al perfil del vendedor"],
    ["card_id", "Referencia a la carta que se vende"],
    ["price / currency", "Precio y moneda (ARS o USD)"],
    ["condition", "Condición de la carta: NM, LP, MP, HP, Damaged"],
    ["status", "Estado: active, sold, paused"],
  ]),
  gap(),

  h3("buy_orders — Órdenes de compra"),
  p("Cada registro es una oferta de compra publicada por un comprador."),
  table(["Columna", "Qué guarda"], [
    ["buyer_id", "Referencia al perfil del comprador"],
    ["price", "Precio que ofrece pagar el comprador"],
    ["status", "Estado: active, reserved, filled, expired"],
    ["expires_at", "Fecha y hora en que vence si nadie lo acepta"],
    ["accepted_by", "Referencia al vendedor que lo aceptó"],
  ]),
  gap(),

  h3("transactions — Transacciones"),
  p("El registro central de cada operación. Une un comprador con un vendedor por una carta específica y rastrea el estado del pago."),
  table(["Columna", "Qué guarda"], [
    ["buyer_id / seller_id", "Referencias a los perfiles de comprador y vendedor"],
    ["price / platform_fee", "Precio total y comisión que cobra la plataforma"],
    ["status", "Estado actual de la transacción"],
    ["mp_preference_id", "ID de la preferencia de pago en MercadoPago"],
    ["mp_payment_id", "ID del pago confirmado en MercadoPago"],
  ]),
  gap(),

  h3("chat_messages — Mensajes"),
  table(["Columna", "Qué guarda"], [
    ["transaction_id", "A qué transacción pertenece el mensaje"],
    ["sender_id", "Quién lo envió (null si es un mensaje del sistema)"],
    ["body", "Texto del mensaje o URL de imagen"],
    ["message_type", "text, image o system"],
  ]),
  gap(),

  h3("admin_settings — Configuración global"),
  table(["Clave", "Valor por defecto", "Qué controla"], [
    ["platform_commission_percent", "5", "Porcentaje que cobra la plataforma por cada venta"],
    ["price_tolerance_percent", "20", "Variación máxima permitida respecto al precio de referencia"],
    ["buy_order_default_days", "30", "Duración predeterminada de un buy order en días"],
    ["max_cancels_before_flag", "3", "Cancelaciones para marcar a un comprador como poco confiable"],
  ]),
  gap(),

  h2("4.3 Migraciones"),
  p("Una migración es un archivo SQL numerado que describe un cambio específico a la base de datos. Están en /supabase/migrations/ con nombres como 001_profiles.sql, 002_cards_catalog.sql, etc."),
  p("Cómo aplicar una migración en producción:"),
  bullet("Paso 1: Abrir el Dashboard de Supabase → SQL Editor"),
  bullet("Paso 2: Copiar el contenido del archivo de migración"),
  bullet("Paso 3: Pegar y ejecutar"),
  bullet("Paso 4: Verificar que no haya errores en el resultado"),
  gap(),
  callout("IMPORTANTE: Nunca modificar un archivo de migración existente. Si se necesita corregir algo, crear un nuevo archivo con un número mayor.", true),
];

// ─── SECCIÓN 5 ───────────────────────────────────────────────────────────────
const s5 = [
  h1("SECCIÓN 5 — Integraciones externas"),
  p("Esta sección describe los servicios externos con los que se conecta CardStash.ar."),

  h2("5.1 MercadoPago"),
  h3("API de Marketplace y split payments"),
  p("MercadoPago Marketplace permite que CardStash.ar facilite pagos entre comprador y vendedor, y automáticamente retenga una comisión (marketplace_fee) en cada operación."),
  callout("IMPORTANTE: La app de MercadoPago debe estar registrada como tipo Marketplace en el panel de desarrolladores. Si está como app regular, el campo marketplace_fee es ignorado silenciosamente.", true),
  gap(),

  h3("Cómo los vendedores vinculan su cuenta (OAuth)"),
  bullet("El vendedor hace clic en Conectar MercadoPago en su perfil"),
  bullet("Se lo redirige a la página de autorización de MercadoPago"),
  bullet("El vendedor autoriza la aplicación CardStash.ar"),
  bullet("MP redirige de vuelta con un código de autorización"),
  bullet("El servidor intercambia ese código por un access_token que se guarda en la base de datos"),
  bullet("Ese token se usa para crear preferencias de pago en nombre del vendedor"),
  gap(),

  h3("Webhook"),
  p("Un webhook es una notificación que MP envía automáticamente al servidor cuando ocurre un evento de pago. El endpoint es /api/payments/webhook."),
  callout("El webhook siempre responde HTTP 200 a MercadoPago, incluso si hubo un error interno. Esto evita que MP reintente el webhook y genere duplicados."),
  gap(),

  h3("Sandbox vs Producción"),
  callout("IMPORTANTE: Nunca mezclar credenciales de sandbox con la base de datos de producción. Un pago de sandbox puede aparecer como aprobado sin que haya dinero real.", true),

  h2("5.2 Scryfall API (Magic: The Gathering)"),
  p("Scryfall es la base de datos más completa de cartas de Magic. API gratuita, sin clave de acceso. Provee nombre, imagen, set, precios en USD."),
  bullet("Scryfall ofrece un archivo JSON masivo con todas las cartas"),
  bullet("El proceso de sync descarga ese archivo, lo filtra y hace un upsert en la tabla cards"),
  bullet("Las imágenes NO se descargan: se usa la URL de Scryfall directamente"),
  bullet("Se recomienda sincronizar semanalmente para capturar nuevas expansiones"),

  h2("5.3 Pokémon TCG API"),
  p("API oficial de Pokémon TCG. Requiere una API key gratuita de pokemontcg.io. Provee nombre, set, imagen, rareza y precios de referencia en USD."),

  h2("5.4 OPTCG API (One Piece)"),
  p("API de la comunidad para One Piece Card Game. Sin autenticación requerida. La sincronización funciona igual que las otras."),

  h2("5.5 Supabase Realtime"),
  p("Tiempo real significa que la interfaz se actualiza automáticamente cuando hay cambios en la base de datos, sin recargar la página."),
  bullet("Chat: los mensajes aparecen instantáneamente"),
  bullet("Página de tendencias: el feed de ventas recientes se actualiza en vivo"),
  bullet("Notificaciones: cuando un vendedor acepta un buy order, el comprador es notificado"),
];

// ─── SECCIÓN 6 ───────────────────────────────────────────────────────────────
const s6 = [
  h1("SECCIÓN 6 — Flujos de pago detallados"),
  p("Esta sección describe qué sucede en el código cuando se procesa un pago."),

  h2("6.1 Compra directa (desde un listing)"),
  table(["Paso", "Usuario", "Sistema"], [
    ["1", "Clic en Comprar", "Transacción creada con status in_chat, chat abierto"],
    ["2", "Clic en Pagar en el chat", "POST /api/payments/create-preference llamado"],
    ["3", "—", "Se obtiene el access_token del vendedor desde la base de datos"],
    ["4", "—", "Se calcula el marketplace_fee según comisión en admin_settings"],
    ["5", "—", "Preferencia de pago creada en MP usando token del vendedor"],
    ["6", "—", "Transacción actualizada a payment_pending, se guarda mp_preference_id"],
    ["7", "Redirigido a Checkout Pro de MP", "—"],
    ["8", "Completa el pago en MP", "MercadoPago procesa el pago"],
    ["9", "—", "MP llama al webhook /api/payments/webhook"],
    ["10", "—", "Transacción actualizada a paid, notificación enviada"],
    ["11", "Vendedor entrega carta", "Vendedor marca transacción como enviada"],
    ["12", "Comprador confirma recepción", "Transacción pasa a completed, reputación recalculada"],
    ["13", "—", "Si no hay confirmación en 72hs, cron job completa automáticamente"],
  ]),
  gap(),

  h2("6.2 Compra por Buy Order"),
  table(["Paso", "Usuario", "Sistema"], [
    ["1", "Comprador publica Buy Order", "Registro en buy_orders con status active"],
    ["2", "Vendedor hace clic en Aceptar", "POST /api/buy-orders/[id]/accept llamado"],
    ["3", "—", "Se verifica que el vendedor tenga MP conectado"],
    ["4", "—", "Buy order actualizado a reserved (bloqueo para evitar doble aceptación)"],
    ["5", "—", "Transacción creada con status pending_buyer_confirmation"],
    ["6", "—", "Notificación al comprador: tienes 24hs para confirmar"],
    ["7", "Comprador confirma y paga", "Flujo igual que pasos 2-12 de compra directa"],
    ["8", "—", "Si no confirma en 24hs, cron job cancela y libera el buy order"],
  ]),
  gap(),

  h2("6.3 Cómo se calcula la comisión"),
  p("La plataforma cobra una comisión automática descontada del dinero que recibe el vendedor. El comprador siempre paga el precio publicado."),
  table(["Concepto", "Cálculo", "Monto"], [
    ["Precio de la carta", "—", "$2.000 ARS"],
    ["Comisión CardStash.ar (5%)", "$2.000 x 0,05", "$100 ARS → cuenta MP de CardStash.ar"],
    ["Comisión MercadoPago (~4%)", "$2.000 x 0,04 aprox.", "$80 ARS → MercadoPago"],
    ["El vendedor recibe", "$2.000 - $100 - $80", "$1.820 ARS"],
    ["El comprador paga", "—", "$2.000 ARS (el precio publicado)"],
  ]),
];

// ─── SECCIÓN 7 ───────────────────────────────────────────────────────────────
const s7 = [
  h1("SECCIÓN 7 — Panel de administración"),
  p("El panel de administración está en la URL /admin y permite gestionar la plataforma sin tocar código."),

  h2("7.1 Acceso"),
  p("No hay un rol de administrador en la base de datos. Se usa una lista de IDs de usuario en la variable de entorno ADMIN_USER_IDS."),
  bullet("Paso 1: Ir al Dashboard de Supabase → Authentication → Users"),
  bullet("Paso 2: Copiar el UUID del usuario"),
  bullet("Paso 3: Agregar ese UUID a ADMIN_USER_IDS en Vercel"),
  bullet("Paso 4: Hacer un nuevo deployment (Redeploy en Vercel)"),
  gap(),

  h2("7.2 Configuración global"),
  table(["Configuración", "Valor recomendado", "Qué hace"], [
    ["platform_commission_percent", "5%", "Porcentaje de cada venta que cobra la plataforma."],
    ["price_tolerance_percent", "20%", "Cuánto puede alejarse el precio de una publicación del precio de referencia."],
    ["buy_order_default_days", "30 días", "Cuántos días dura un buy order por defecto."],
    ["max_cancels_before_flag", "3 cancelaciones", "A partir de cuántas cancelaciones un comprador se marca como poco confiable."],
  ]),
  gap(),

  h2("7.3 Sincronización de cartas"),
  p("Desde el panel se puede disparar la sincronización del catálogo. Puede tardar varios minutos para Magic (miles de cartas)."),
  p("Qué hacer si falla:"),
  bullet("Verificar que las APIs externas estén respondiendo"),
  bullet("Revisar los logs en Vercel → Functions"),
  bullet("Esperar 10 minutos y reintentar"),
  gap(),

  h2("7.4 Gestión de disputas"),
  p("Cuando un comprador abre una disputa, aparece en el panel para revisión. El administrador puede ver el historial de mensajes y decidir a favor de quién resolver."),
  callout("Las devoluciones de dinero se hacen directamente desde el Dashboard de MercadoPago → Actividad → buscar la transacción → Devolver. El panel de CardStash.ar solo registra la decisión."),
];

// ─── SECCIÓN 8 ───────────────────────────────────────────────────────────────
const s8 = [
  h1("SECCIÓN 8 — Despliegue y mantenimiento"),
  p("Esta sección explica cómo se publica el código en Internet y qué hacer cuando algo falla."),

  h2("8.1 Entornos: Desarrollo vs Producción"),
  table(["Característica", "Desarrollo (local)", "Producción"], [
    ["Dónde corre", "Tu computadora", "Servidores de Vercel"],
    ["URL", "http://localhost:3000", "https://cardstash.ar"],
    ["Base de datos", "Supabase dev (datos de prueba)", "Supabase prod (datos reales)"],
    ["MercadoPago", "Credenciales Sandbox (sin dinero real)", "Credenciales de Producción"],
  ]),
  gap(),
  callout("IMPORTANTE: Nunca usar credenciales de producción en el entorno local, ni las de sandbox en producción.", true),

  h2("8.2 Cómo publicar un cambio"),
  bullet("Paso 1: Hacer los cambios en el código localmente"),
  bullet("Paso 2: Probar que todo funciona con npm run dev"),
  bullet("Paso 3: git add . → git commit -m descripcion → git push"),
  bullet("Paso 4: Vercel detecta el push y construye el nuevo deployment automáticamente"),
  bullet("Paso 5: Esperar 2-5 minutos y revisar los logs en el Dashboard de Vercel"),
  bullet("Paso 6: Verificar en https://cardstash.ar que el cambio funciona"),
  gap(),
  callout("Si el build falla en Vercel, el deployment anterior sigue activo. El sitio nunca queda caído por un build fallido."),

  h2("8.3 Cron jobs (tareas programadas)"),
  table(["Endpoint", "Frecuencia", "Qué hace"], [
    ["/api/cron/auto-cancel-buy-orders", "Cada hora", "Cancela transacciones de buy orders que el comprador no confirmó en 24 horas"],
    ["/api/cron/expire-buy-orders", "Diariamente a las 3am UTC", "Marca como expired todos los buy orders que llegaron a su vencimiento"],
  ]),
  gap(),

  h2("8.4 Cómo monitorear errores"),
  bullet("Vercel Dashboard → Logs: errores de las funciones del servidor en tiempo real"),
  bullet("Supabase Dashboard → Logs → API: errores de base de datos"),
  bullet("MercadoPago Developers → Webhooks: historial de notificaciones enviadas"),
  gap(),

  h2("8.5 Qué hacer si algo falla en producción"),
  table(["Síntoma", "Dónde revisar", "Acción"], [
    ["El sitio no carga", "Vercel → Deployments", "Hacer Redeploy del deployment anterior"],
    ["Los pagos no funcionan", "MP Developers → Webhooks", "Verificar que los webhooks lleguen con status 200"],
    ["El chat no actualiza", "Supabase → Realtime", "Verificar que Realtime esté habilitado en chat_messages"],
    ["Las cartas no aparecen", "Vercel Logs → sync endpoints", "Disparar una sincronización manual desde el panel de admin"],
    ["La base de datos no responde", "status.supabase.com", "Si hay incidente activo, esperar. Si no, revisar logs de Supabase."],
  ]),
];

// ─── SECCIÓN 9 ───────────────────────────────────────────────────────────────
const s9 = [
  h1("SECCIÓN 9 — Documentos legales"),
  p("Esta sección lista los documentos legales de la plataforma y desde dónde se accede a ellos."),
  gap(),
  table(["Documento", "Ubicación en código", "Acceso desde el sitio"], [
    ["Términos y Condiciones", "/app/terms/page.tsx y /lib/terms.ts", "Footer del sitio, formulario de registro (obligatorio aceptar)"],
    ["Política de Privacidad", "/app/privacy/page.tsx", "Footer del sitio, página de Términos"],
    ["Guía de condición de cartas", "/reference/singles_ar_guia_condicion.html", "Al crear una publicación"],
  ]),
  gap(),
  p("Los Términos y Condiciones son obligatorios: ningún usuario puede completar el registro sin aceptar explícitamente todos sus puntos. La aceptación queda registrada en los metadatos del usuario en Supabase (user_metadata.terms_accepted)."),
];

// ─── SECCIÓN 10 ──────────────────────────────────────────────────────────────
const s10 = [
  h1("SECCIÓN 10 — Glosario"),
  p("Definiciones de todos los términos técnicos y específicos de la plataforma usados en este documento."),
  gap(),
  table(["Término", "Definición"], [
    ["TCG", "Trading Card Game (Juego de Cartas Coleccionables): Magic, Pokémon, One Piece."],
    ["Singles", "Cartas individuales (en contraposición a sobres sellados)."],
    ["Listing", "Publicación de venta: un vendedor anuncia que quiere vender una carta a un precio determinado."],
    ["Buy Order", "Orden de compra: un comprador anuncia que quiere comprar una carta a un precio determinado."],
    ["Wishlist", "Lista de deseos: cartas que un usuario quiere conseguir."],
    ["Webhook", "Notificación automática que un servicio externo envía a nuestro servidor cuando ocurre un evento."],
    ["OAuth", "Sistema estándar de autorización que permite que un usuario le dé permisos a una aplicación sin compartir su contraseña."],
    ["API", "Interfaz de programación: una conexión que permite que dos sistemas intercambien datos."],
    ["Cron job", "Tarea programada que se ejecuta automáticamente en intervalos fijos."],
    ["Sandbox", "Entorno de pruebas sin dinero real ni consecuencias reales."],
    ["Deploy", "Publicar una nueva versión del código en Internet para que los usuarios la puedan usar."],
    ["Migración", "Archivo SQL numerado que describe un cambio específico a la base de datos."],
    ["RLS", "Row Level Security: sistema de Supabase que controla qué filas puede ver o editar cada usuario."],
    ["Split Payment", "Pago dividido automáticamente entre el vendedor y la plataforma."],
    ["Marketplace Fee", "Comisión que la plataforma cobra en cada transacción."],
    ["Checkout Pro", "La interfaz de pago visual de MercadoPago donde el comprador ingresa sus datos."],
    ["UUID", "Identificador único universal, como 61a0b0da-74d3-..., que identifica de forma única a un registro."],
    ["PKCE", "Protocolo de seguridad para el flujo OAuth en aplicaciones web."],
  ]),
];

// ─── APÉNDICE ─────────────────────────────────────────────────────────────────
const apendice = [
  h1("Apéndice — Contactos y recursos"),
  h2("Repositorio y servicios"),
  table(["Recurso", "URL / Dato"], [
    ["Repositorio GitHub", "https://github.com/alejandrobreuer/singles-ar"],
    ["Vercel (producción)", "https://vercel.com/dashboard → proyecto singles-ar"],
    ["MercadoPago Developers", "https://www.mercadopago.com.ar/developers/panel/app"],
    ["Email de soporte", "soporte@cardstash.ar"],
  ]),
  gap(),
  h2("Documentación técnica externa"),
  table(["Servicio", "URL de documentación"], [
    ["Scryfall API", "https://scryfall.com/docs/api"],
    ["Pokémon TCG API", "https://docs.pokemontcg.io"],
    ["MercadoPago Marketplace", "https://www.mercadopago.com.ar/developers/es/docs/marketplace/landing"],
    ["Supabase Docs", "https://supabase.com/docs"],
    ["Next.js Docs", "https://nextjs.org/docs"],
    ["Vercel Docs", "https://vercel.com/docs"],
  ]),
  gap(),
  h2("Estado de los servicios externos"),
  bullet("Supabase: https://status.supabase.com"),
  bullet("Vercel: https://www.vercel-status.com"),
];

// =============================================================================
// BUILD
// =============================================================================
const doc = new Document({
  numbering,
  sections: [{
    properties: {
      page: {
        size:   { width: 11906, height: 16838 },
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
      },
    },
    headers: { default: docHeader },
    footers: { default: docFooter },
    children: [
      ...cover,
      ...toc,
      ...s1, ...s2, ...s3, ...s4, ...s5,
      ...s6, ...s7, ...s8, ...s9, ...s10,
      ...apendice,
    ],
  }],
});

const buf = await Packer.toBuffer(doc);
writeFileSync("docs/cardstash_documentation.docx", buf);
console.log("Generated docs/cardstash_documentation.docx —", buf.length, "bytes");
