import nodemailer from 'nodemailer';

export function getAppBaseUrl(): string {
  const u = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
  return u.replace(/\/$/, '');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export type SendEmailResult = { ok: boolean; skipped?: boolean; error?: string };

/**
 * E-mail transacional — **não usa Supabase**.
 *
 * Configure **um** dos provedores:
 * - **Resend**: `RESEND_API_KEY` + `EMAIL_FROM` (domínio verificado na Resend)
 * - **SMTP** (Gmail app password, Outlook, hostinger, etc.): `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
 *   opcionais: `SMTP_PORT` (default 587), `SMTP_SECURE=true` para porta 465
 */
export async function sendTransactionalEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    console.warn('[email] Defina EMAIL_FROM no .env para enviar e-mails.');
    return { ok: false, skipped: true };
  }

  const toList = (Array.isArray(opts.to) ? opts.to : [opts.to]).map((t) => t.trim()).filter(Boolean);
  if (toList.length === 0) {
    return { ok: false, skipped: true, error: 'Sem destinatário' };
  }

  const text = opts.text ?? stripHtml(opts.html);

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: toList,
          subject: opts.subject,
          html: opts.html,
          text,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        console.error('[email] Resend:', res.status, data);
        return { ok: false, error: data?.message ?? `HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (e: any) {
      console.error('[email] Resend fetch:', e);
      return { ok: false, error: e?.message ?? 'Resend error' };
    }
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    try {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to: toList.join(', '),
        subject: opts.subject,
        html: opts.html,
        text,
      });
      return { ok: true };
    } catch (e: any) {
      console.error('[email] SMTP:', e);
      return { ok: false, error: e?.message ?? 'SMTP error' };
    }
  }

  console.warn(
    '[email] Nenhum provedor: defina RESEND_API_KEY ou SMTP_HOST + SMTP_USER + SMTP_PASS.'
  );
  return { ok: false, skipped: true };
}

/** Lista de e-mails do admin (separados por vírgula). */
export function getAdminNotificationEmails(): string[] {
  const raw = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
}
