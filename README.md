# Singles.ar

Marketplace de cartas TCG (Magic, Pokémon, One Piece, Dragon Ball) para Argentina.
Pagos via MercadoPago Marketplace, chat en tiempo real, buy orders, sistema de reputación.

---

## Stack

- **Next.js 14** (App Router, RSC, ISR)
- **Supabase** (Postgres + RLS + Realtime + Storage)
- **MercadoPago** (split payments via Marketplace API)
- **Tailwind CSS** + `sonner` (toasts) + `date-fns`

---

## Setup local

### 1. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/singles-ar.git
cd singles-ar
npm install
```

### 2. Variables de entorno

Completá `.env.local` con los siguientes valores:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (nunca expongas al cliente) |
| `MP_ACCESS_TOKEN` | Access token de la cuenta plataforma en MercadoPago |
| `MP_PUBLIC_KEY` | Public key de MercadoPago |
| `MP_CLIENT_ID` | Client ID de la app MercadoPago |
| `NEXT_PUBLIC_MP_CLIENT_ID` | Mismo valor que `MP_CLIENT_ID` (expuesto al cliente para OAuth) |
| `MP_CLIENT_SECRET` | Client secret de la app MercadoPago |
| `MP_WEBHOOK_SECRET` | Secret configurado en MP Dashboard → Webhooks |
| `TCGPLAYER_CLIENT_ID` | Client ID de TCGPlayer API |
| `TCGPLAYER_CLIENT_SECRET` | Client secret de TCGPlayer API |
| `APITCG_API_KEY` | API key de [apitcg.com/platform](https://apitcg.com/platform), usada para sincronizar cartas de Dragon Ball |
| `CRON_SECRET` | String aleatorio para proteger los endpoints de cron |
| `NEXT_PUBLIC_APP_URL` | URL pública del sitio (`https://singles.ar` en prod) |
| `ADMIN_USER_IDS` | UUIDs de Supabase separados por coma de los admins |

### 3. Migrar base de datos

Ejecutá las migraciones en orden desde `supabase/migrations/` en el SQL Editor de Supabase,
o con Supabase CLI:

```bash
supabase db push
```

Migraciones en orden: `001` → `002` → `003` → `004` → `005` → `006` → `007` → `008`.

### 4. Bucket de Storage

En Supabase Dashboard → Storage, creá un bucket llamado **`chat-images`** con acceso público.

### 5. Correr en desarrollo

```bash
npm run dev
```

---

## Agregar admins

1. Obtené el UUID del usuario desde Supabase → Authentication → Users
2. Agregalo a `.env.local`:
   ```
   ADMIN_USER_IDS=uuid-1,uuid-2
   ```
3. En Vercel, actualizá la variable de entorno y redesplegá.

El panel de administración está en `/admin`.

---

## Sincronización de cartas (Scryfall)

Para importar cartas de Magic desde Scryfall, llamá al endpoint de cron manualmente:

```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" \
  https://singles.ar/api/cron/sync-scryfall
```

El cron job automático expira buy orders vencidos diariamente a las 3 AM UTC
(`/api/cron/expire-buy-orders`).

---

## MercadoPago OAuth (vendedores)

1. Creá una aplicación en [MercadoPago Developers](https://www.mercadopago.com.ar/developers)
2. Configurá la **Redirect URI** como:
   ```
   https://singles.ar/api/auth/mercadopago/callback
   ```
3. Completá `MP_CLIENT_ID`, `MP_CLIENT_SECRET` en el entorno
4. Los usuarios conectan su cuenta en **Perfil → Configuración → MercadoPago**
5. Configurá el webhook en MP Dashboard apuntando a:
   ```
   https://singles.ar/api/payments/webhook
   ```
   Copiá el secret del webhook a `MP_WEBHOOK_SECRET`.

---

## Deploy en Vercel

### Variables de entorno

Copiá todas las variables de `.env.local` al panel de Vercel → Settings → Environment Variables.
Marcá `SUPABASE_SERVICE_ROLE_KEY` y `MP_ACCESS_TOKEN` como secretas.

### Cron jobs

`vercel.json` configura el cron automáticamente (requiere plan Vercel Pro):

```json
{
  "crons": [{ "path": "/api/cron/expire-buy-orders", "schedule": "0 3 * * *" }]
}
```

El endpoint valida `Authorization: Bearer $CRON_SECRET`.

---

## Seguridad y privacidad

- Los **emails de usuarios nunca se exponen** en respuestas públicas de la API.
  Solo los admins autenticados pueden verlos vía `/api/admin/users`.
- `PublicProfile` solo incluye: `id`, `username`, `avatar_url`, `reputation_score`,
  `total_sales`, `is_reliable_buyer`. Sin email, sin tokens, sin datos sensibles.
- `SUPABASE_SERVICE_ROLE_KEY` y `MP_ACCESS_TOKEN` solo se usan server-side.
- El webhook de MercadoPago verifica firma **HMAC-SHA256** antes de procesar eventos.
- Los endpoints de admin requieren que el `user.id` esté listado en `ADMIN_USER_IDS`.
- RLS en Supabase protege todas las tablas por defecto.
