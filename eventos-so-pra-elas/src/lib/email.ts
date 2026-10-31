import QRCode from "qrcode";
import { Resend } from "resend";
import type { EventRow, Registration } from "./types";
import { brl, dateTime, eventDateLong, firstName, ticketUrl, waLink } from "./format";
import { contactWhatsapp, getSellerById } from "./data";

const PLUM = "#8E2A5C";
const INK = "#2A1B24";
const MUTED = "#6C5A65";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#FBF8FA;font-family:Helvetica,Arial,sans-serif;color:${INK}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E8DCE3;border-radius:12px">
<tr><td style="padding:28px 28px 8px"><div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${PLUM};font-weight:bold">Movimento Só Pra Elas</div>
<h1 style="margin:8px 0 0;font-size:24px;line-height:1.25">${title}</h1></td></tr>
<tr><td style="padding:8px 28px 28px;font-size:16px;line-height:1.6">${body}</td></tr>
</table>
<p style="font-size:12px;color:${MUTED};max-width:560px">Você recebeu este email porque se inscreveu num evento do Movimento Só Pra Elas.</p>
</td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${href}" style="background:${PLUM};color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:bold;display:inline-block">${label}</a></p>`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 0;color:${MUTED};width:130px;vertical-align:top">${label}</td><td style="padding:6px 0;font-weight:bold">${value}</td></tr>`;
}

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY ausente: email não enviado");
    return null;
  }
  return new Resend(key);
}

async function send(to: string, subject: string, html: string, attachments?: { filename: string; content: Buffer; contentId: string }[]) {
  const resend = client();
  if (!resend) return false;
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Só Pra Elas <onboarding@resend.dev>",
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    to,
    subject,
    html,
    attachments,
  });
  if (error) {
    console.error("[email] falha ao enviar", error);
    return false;
  }
  return true;
}

export function salesWhatsappText(reg: Registration, contactName: string | null): string {
  const hi = contactName ? `Oi ${firstName(contactName)}!` : "Oi!";
  return `${hi} Segue o comprovante do PIX da minha inscrição ${reg.code} (${reg.name}).`;
}

/** Link de WhatsApp pra participante mandar o comprovante (vendedora da inscrição ou contato do evento). */
export async function receiptWhatsappLink(reg: Registration, ev: EventRow): Promise<string | null> {
  const c = contactWhatsapp(ev, await getSellerById(reg.seller_id));
  return c.phone ? waLink(c.phone, salesWhatsappText(reg, c.name)) : null;
}

export async function sendPendingEmail(reg: Registration, ev: EventRow) {
  const link = ticketUrl(reg.ticket_token);
  const wa = await receiptWhatsappLink(reg, ev);
  const body = `
<p>Oi, ${esc(firstName(reg.name))}! Recebemos sua inscrição no <b>${esc(ev.name)}</b>, ${esc(eventDateLong(ev.event_date))}.</p>
<p>Pra garantir sua vaga, faça o PIX e envie o comprovante pelo WhatsApp:</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;font-size:15px">
${row("Inscrição", esc(reg.code))}
${row("Valor", brl(ev.price_cents))}
${row("Chave PIX", esc(ev.pix_key ?? "enviaremos em breve"))}
${row("Nome", esc(ev.pix_holder ?? ""))}
${row("Pagar até", dateTime(reg.expires_at))}
</table>
${wa ? button(wa, "Enviar comprovante no WhatsApp") : ""}
<p style="color:${MUTED};font-size:14px">Assim que o pagamento for confirmado, você recebe outro email com o seu ingresso e o QR code de entrada. Você também pode acompanhar pelo link: <a href="${link}" style="color:${PLUM}">${link}</a></p>`;
  return send(reg.email, `Inscrição ${reg.code}: falta só o PIX`, layout("Sua vaga está reservada", body));
}

export async function sendTicketEmail(reg: Registration, ev: EventRow) {
  const link = ticketUrl(reg.ticket_token);
  const png = await QRCode.toBuffer(link, { width: 480, margin: 2, errorCorrectionLevel: "M" });
  const where = [ev.venue_name, ev.venue_address].filter(Boolean).join(", ");
  const body = `
<p>Oi, ${esc(firstName(reg.name))}! Pagamento confirmado. Te esperamos no <b>${esc(ev.name)}</b>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;font-size:15px">
${row("Inscrição", esc(reg.code))}
${row("Data", esc(eventDateLong(ev.event_date)) + (ev.start_time ? `, ${esc(ev.start_time)}` : ""))}
${where ? row("Local", esc(where)) : ""}
</table>
<p style="text-align:center;margin:24px 0 8px"><img src="cid:qrcode" width="240" height="240" alt="QR code do ingresso ${esc(reg.code)}" style="border:1px solid #E8DCE3;border-radius:8px"></p>
<p style="text-align:center;color:${MUTED};font-size:14px;margin:0">Mostre este QR code na entrada.</p>
${button(link, "Abrir meu ingresso")}
${ev.menu_info ? `<p><b>Cardápio</b><br>${esc(ev.menu_info).replace(/\n/g, "<br>")}</p>` : ""}`;
  return send(reg.email, `Seu ingresso: ${ev.name}`, layout("Inscrição confirmada", body), [
    { filename: `ingresso-${reg.code}.png`, content: png, contentId: "qrcode" },
  ]);
}

export async function sendExistingEmail(reg: Registration, ev: EventRow) {
  return reg.status === "paid" ? sendTicketEmail(reg, ev) : sendPendingEmail(reg, ev);
}
