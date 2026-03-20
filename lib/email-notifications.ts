import { sendTransactionalEmail, getAppBaseUrl, getAdminNotificationEmails } from '@/lib/email';

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1e293b;max-width:560px;margin:0 auto;padding:16px;">
  <p style="font-size:18px;font-weight:700;color:#b91c1c;">MACOFEL</p>
  <h1 style="font-size:20px;margin:0 0 12px;">${title}</h1>
  ${bodyHtml}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
  <p style="font-size:12px;color:#64748b;">Mensagem automática — não responda a este e-mail se não for suportado pelo seu provedor.</p>
</body></html>`;
}

/** Nova solicitação de orçamento (cliente enviou lista). */
export function notifyAdminsNewQuoteRequest(payload: {
  quoteId: string;
  clientName: string;
  clientEmail: string;
  itemCount: number;
}): void {
  const admins = getAdminNotificationEmails();
  if (admins.length === 0) {
    console.warn('[email] ADMIN_NOTIFICATION_EMAIL vazio — admin não será notificado.');
    return;
  }
  const base = getAppBaseUrl();
  const link = `${base}/admin/solicitacoes-orcamento/${payload.quoteId}`;
  const html = layout(
    'Nova solicitação de orçamento',
    `<p><strong>${escapeHtml(payload.clientName)}</strong> (${escapeHtml(payload.clientEmail)}) enviou uma solicitação com <strong>${payload.itemCount}</strong> item(ns).</p>
    <p><a href="${link}" style="color:#b91c1c;">Abrir e montar proposta →</a></p>`
  );
  void sendTransactionalEmail({
    to: admins,
    subject: `[MACOFEL] Nova solicitação de orçamento — ${payload.clientName}`,
    html,
  }).then((r) => {
    if (!r.ok && !r.skipped) console.error('[email] notifyAdminsNewQuoteRequest:', r.error);
  });
}

/** Cliente recebeu proposta com frete / PIX / parcelas. */
export function notifyClientProposalSent(payload: {
  quoteId: string;
  toEmail: string;
  clientName: string;
}): void {
  if (!payload.toEmail?.includes('@')) return;
  const base = getAppBaseUrl();
  const link = `${base}/minha-conta/solicitacoes-orcamento`;
  const html = layout(
    'Sua proposta da MACOFEL está pronta',
    `<p>Olá, <strong>${escapeHtml(payload.clientName)}</strong>,</p>
    <p>Enviamos uma proposta com valores de frete, condições de PIX e parcelamento. Acesse sua conta para <strong>aceitar ou recusar</strong>.</p>
    <p><a href="${link}" style="color:#b91c1c;">Ver proposta na minha conta →</a></p>
    <p style="font-size:14px;color:#64748b;">Em caso de dúvidas, fale conosco pelo WhatsApp da loja.</p>`
  );
  void sendTransactionalEmail({
    to: payload.toEmail,
    subject: '[MACOFEL] Resposta ao seu pedido de orçamento',
    html,
  }).then((r) => {
    if (!r.ok && !r.skipped) console.error('[email] notifyClientProposalSent:', r.error);
  });
}

/** Cliente aceitou a proposta. */
export function notifyAdminsProposalAccepted(payload: {
  quoteId: string;
  clientName: string;
  clientEmail: string;
}): void {
  const admins = getAdminNotificationEmails();
  if (admins.length === 0) return;
  const base = getAppBaseUrl();
  const link = `${base}/admin/solicitacoes-orcamento/${payload.quoteId}`;
  const html = layout(
    'Cliente aceitou a proposta',
    `<p><strong>${escapeHtml(payload.clientName)}</strong> (${escapeHtml(payload.clientEmail)}) <strong>aceitou</strong> a proposta de orçamento.</p>
    <p><a href="${link}" style="color:#b91c1c;">Ver solicitação →</a></p>`
  );
  void sendTransactionalEmail({
    to: admins,
    subject: `[MACOFEL] Orçamento aceito — ${payload.clientName}`,
    html,
  }).then((r) => {
    if (!r.ok && !r.skipped) console.error('[email] notifyAdminsProposalAccepted:', r.error);
  });
}

/** Cliente recusou a proposta. */
export function notifyAdminsProposalRejected(payload: {
  quoteId: string;
  clientName: string;
  clientEmail: string;
}): void {
  const admins = getAdminNotificationEmails();
  if (admins.length === 0) return;
  const base = getAppBaseUrl();
  const link = `${base}/admin/solicitacoes-orcamento/${payload.quoteId}`;
  const html = layout(
    'Cliente recusou a proposta',
    `<p><strong>${escapeHtml(payload.clientName)}</strong> (${escapeHtml(payload.clientEmail)}) <strong>não aceitou</strong> a proposta de orçamento.</p>
    <p><a href="${link}" style="color:#b91c1c;">Ver solicitação →</a></p>`
  );
  void sendTransactionalEmail({
    to: admins,
    subject: `[MACOFEL] Orçamento recusado — ${payload.clientName}`,
    html,
  }).then((r) => {
    if (!r.ok && !r.skipped) console.error('[email] notifyAdminsProposalRejected:', r.error);
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
