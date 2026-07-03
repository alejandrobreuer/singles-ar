import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? "https://singles.ar";
const FROM     = "Singles.ar <noreply@singles.ar>";

// ─── Template ─────────────────────────────────────────────────────────────────

function buildHtml(title: string, body: string | null | undefined, link: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="background:#1a2744;border-radius:12px 12px 0 0;padding:24px 32px;">
              <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Singles.ar</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;line-height:1.4;">${title}</p>
              ${body ? `<p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">${body}</p>` : "<div style='margin-bottom:24px;'></div>"}
              <a href="${APP_URL}${link}"
                 style="display:inline-block;background:#1a2744;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
                Ver en Singles.ar →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Recibís este email porque tenés una cuenta en Singles.ar.<br/>
                <a href="${APP_URL}/profile" style="color:#b5862a;text-decoration:none;">Administrar notificaciones</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  title,
  body,
  link,
}: {
  to:      string;
  subject: string;
  title:   string;
  body?:   string | null;
  link:    string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return; // skip silently in dev if key not set

  try {
    await resend.emails.send({
      from:    FROM,
      to,
      subject,
      html:    buildHtml(title, body, link),
    });
  } catch (err) {
    // Never let an email failure break the main flow
    console.error("[email] send failed:", err);
  }
}
