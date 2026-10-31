import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug, seatsTaken } from "@/lib/data";
import { brl, eventDateLong } from "@/lib/format";
import RegistrationForm from "./RegistrationForm";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const ev = await getEventBySlug((await params).slug);
  return ev ? { title: `Inscrição · ${ev.name}`, description: `${eventDateLong(ev.event_date)}${ev.venue_name ? `, ${ev.venue_name}` : ""}.` } : {};
}

export default async function EventPage({ params }: Params) {
  const { slug } = await params;
  const ev = await getEventBySlug(slug);
  if (!ev) notFound();

  const left = ev.capacity - (await seatsTaken(ev.id));
  const soldOut = left <= 0;

  return (
    <main className="page">
      <header className="stack">
        <span className="eyebrow">Movimento Só Pra Elas</span>
        <h1>{ev.name}</h1>
        <dl className="facts">
          <div><dt>Data</dt><dd>{eventDateLong(ev.event_date)}{ev.start_time ? `, ${ev.start_time}` : ""}</dd></div>
          {ev.venue_name && <div><dt>Local</dt><dd>{ev.venue_name}</dd></div>}
          <div><dt>Ingresso</dt><dd>{brl(ev.price_cents)} no PIX</dd></div>
        </dl>
        {ev.venue_address && <p className="muted small">{ev.venue_address}</p>}
      </header>

      {ev.menu_info && (
        <section className="card stack">
          <h2>Cardápio</h2>
          <p style={{ whiteSpace: "pre-line" }}>{ev.menu_info}</p>
        </section>
      )}

      <section className="stack">
        <h2>Inscrição</h2>
        {!ev.registrations_open ? (
          <div className="alert warn">As inscrições ainda não abriram. Volte em breve.</div>
        ) : soldOut ? (
          <div className="alert warn">As vagas esgotaram.</div>
        ) : (
          <>
            <p className="muted">Depois de enviar, você recebe a chave PIX. A vaga fica reservada por {ev.pending_ttl_hours} horas até a confirmação do pagamento.{left <= 20 ? ` Restam ${left} vagas.` : ""}</p>
            <RegistrationForm slug={ev.slug} askDietary={ev.ask_dietary} consentText={ev.image_consent_text} />
          </>
        )}
      </section>
    </main>
  );
}
