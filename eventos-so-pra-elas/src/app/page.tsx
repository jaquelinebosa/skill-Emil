import Link from "next/link";
import { listEvents } from "@/lib/data";
import { eventDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home() {
  const events = (await listEvents()).filter((e) => e.event_date >= new Date().toISOString().slice(0, 10));
  return (
    <main className="page">
      <span className="eyebrow">Movimento Só Pra Elas</span>
      <h1>Próximos eventos</h1>
      {events.length === 0 && <p className="muted">Nenhum evento com inscrições no momento.</p>}
      <div className="stack">
        {events.map((e) => (
          <Link key={e.id} href={`/${e.slug}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <h2>{e.name}</h2>
            <p className="muted">{eventDateLong(e.event_date)}{e.venue_name ? ` · ${e.venue_name}` : ""}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
