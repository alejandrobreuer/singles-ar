import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail }         from "@/lib/email";

export type NotificationType = "card_sold" | "card_bought" | "new_message" | "wishlist_stock" | "buy_order_accepted";

export interface NotificationInput {
  user_id: string;
  type:    NotificationType;
  title:   string;
  body?:   string | null;
  link:    string;
}

// new_message notifications fire on every chat message — emailing each one
// would be too noisy. All other types are meaningful one-time events.
const EMAIL_TYPES: NotificationType[] = ["card_sold", "card_bought", "wishlist_stock", "buy_order_accepted"];

function subjectFor(type: NotificationType, title: string): string {
  switch (type) {
    case "card_sold":          return `Singles.ar — ${title}`;
    case "card_bought":        return `Singles.ar — ${title}`;
    case "buy_order_accepted": return "Singles.ar — Tu buy order fue aceptado";
    case "wishlist_stock":     return `Singles.ar — ${title}`;
    default:                   return `Singles.ar — ${title}`;
  }
}

// ─── notify ───────────────────────────────────────────────────────────────────

export async function notify(input: NotificationInput): Promise<void> {
  const admin = createAdminClient();

  await admin.from("notifications").upsert(
    {
      user_id:    input.user_id,
      type:       input.type,
      title:      input.title,
      body:       input.body ?? null,
      link:       input.link,
      read_at:    null,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,type,link" }
  );

  if (!EMAIL_TYPES.includes(input.type)) return;

  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", input.user_id)
    .single();

  if (!profile?.email) return;

  await sendEmail({
    to:      profile.email,
    subject: subjectFor(input.type, input.title),
    title:   input.title,
    body:    input.body,
    link:    input.link,
  });
}

// ─── notifyMany ───────────────────────────────────────────────────────────────

export async function notifyMany(inputs: NotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;

  const admin = createAdminClient();
  const now   = new Date().toISOString();

  await admin.from("notifications").upsert(
    inputs.map((input) => ({
      user_id:    input.user_id,
      type:       input.type,
      title:      input.title,
      body:       input.body ?? null,
      link:       input.link,
      read_at:    null,
      created_at: now,
    })),
    { onConflict: "user_id,type,link" }
  );

  const emailable = inputs.filter((i) => EMAIL_TYPES.includes(i.type));
  if (emailable.length === 0) return;

  const userIds = Array.from(new Set(emailable.map((i) => i.user_id)));
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  if (!profiles || profiles.length === 0) return;

  const emailMap = new Map(profiles.map((p) => [p.id, p.email as string | null]));

  await Promise.all(
    emailable.map((input) => {
      const email = emailMap.get(input.user_id);
      if (!email) return Promise.resolve();
      return sendEmail({
        to:      email,
        subject: subjectFor(input.type, input.title),
        title:   input.title,
        body:    input.body,
        link:    input.link,
      });
    })
  );
}
