import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType = "card_sold" | "card_bought" | "new_message" | "wishlist_stock" | "buy_order_accepted";

export interface NotificationInput {
  user_id: string;
  type:    NotificationType;
  title:   string;
  body?:   string | null;
  link:    string;
}

// Upsert: if a notification with the same (user_id, type, link) already exists
// (e.g. a second message in the same chat), bump created_at and reset read_at.
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
}

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
}
