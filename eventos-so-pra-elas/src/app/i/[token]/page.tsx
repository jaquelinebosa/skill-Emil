import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import CopyButton from "@/components/CopyButton";
import { getEventById, getRegistrationByToken } from "@/lib/data";
import { salesWhatsappText } from "@/lib/email";
import { brl, dateTime, displayStatus, eventDateLong, firstName, ticketUrl, timeOnly, waLink } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Minha inscrição", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ nova?: string }> };

export default async function TicketPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { nova } = await searchParams;
  const reg = await getRegistrationByToken(token);
  if (!reg) notFound();
  const ev = await getEventById(reg.event_id);
  if (!ev) notFound();

  const status = displayStatus(reg);
  const wa = ev.sales_whatsapp ? waLink(ev.sales_whatsapp, salesWhatsappText(reg)) : null;
  const where = [ev.venue_name, ev.venue_address].filter(Boolean).join(", ");

  return (
    <main className="page">
      <header className="stack">
        <span className="eyebrow">{ev.name}</span>
        <h1>
          {status === "paid" && `${firstName(reg.name)}, sua presença está garantida`}
          {status === "pending" && (nova ? "Sua vaga está reservada" : "Falta só o PIX")}
          {status === "expired" && "Esta reserva expirou"}
          {status === "cancelled" && "Inscrição cancelada"}
        </h1>
      </header>

      {status === "pending" && (
        <>
          <p>Faça o PIX abaixo e envie o comprovante pelo WhatsApp. Mandamos estes dados também para <b>{reg.email}</b>.</p>
          <section className="card pix">
            <dl className="kv">
              <dt>Inscrição</dt><dd>{reg.code}</dd>
              <dt>Valor</dt><dd>{brl(ev.price_cents)}</dd>
              {ev.pix_holder && (<><dt>Nome</dt><dd>{ev.pix_holder}</dd></>)}
              <dt>Pagar até</dt><dd>{dateTime(reg.expires_at)}</dd>
            </dl>
            {ev.pix_key ? (
              <>
                <span className="muted small">Chave PIX</span>
                <div className="pix-key">{ev.pix_key}</div>
                <CopyButton text={ev.pix_key} label="Copiar chave PIX" />
              </>
            ) : (
              <div className="alert warn">A chave PIX vai ser enviada em breve por email.</div>
            )}
          </section>
          {wa && (
            <a className="btn wa block" href={wa} target="_blank" rel="noopener noreferrer">Enviar comprovante no WhatsApp</a>
          )}
          <p className="muted small">Assim que o pagamento for confirmado, você recebe o ingresso com QR code por email. Esta página também se atualiza: guarde o link.</p>
        </>
      )}

      {status === "paid" && (
        <section className="card ticket">
          <div className="qr" dangerouslySetInnerHTML={{ __html: await QRCode.toString(ticketUrl(reg.ticket_token), { type: "svg", margin: 1, errorCorrectionLevel: "M" }) }} />
          <span className="code">{reg.code}</span>
          <b>{reg.name}</b>
          {reg.checked_in_at ? (
            <span className="pill present">Entrada registrada às {timeOnly(reg.checked_in_at)}</span>
          ) : (
            <span className="muted small">Mostre este QR code na entrada. Vale um screenshot.</span>
          )}
          <dl className="kv" style={{ textAlign: "left", width: "100%" }}>
            <dt>Data</dt><dd>{eventDateLong(ev.event_date)}{ev.start_time ? `, ${ev.start_time}` : ""}</dd>
            {where && (<><dt>Local</dt><dd>{where}</dd></>)}
          </dl>
        </section>
      )}

      {status === "paid" && ev.menu_info && (
        <section className="card stack">
          <h2>Cardápio</h2>
          <p style={{ whiteSpace: "pre-line" }}>{ev.menu_info}</p>
        </section>
      )}

      {status === "expired" && (
        <>
          <p>O prazo de pagamento da inscrição {reg.code} terminou e a vaga voltou pra venda.</p>
          <p>Se você já fez o PIX, envie o comprovante pelo WhatsApp que a gente resolve.</p>
          {wa && <a className="btn wa block" href={wa} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>}
        </>
      )}

      {status === "cancelled" && <p>A inscrição {reg.code} foi cancelada. Em caso de dúvida, fale com a organização.</p>}
    </main>
  );
}
