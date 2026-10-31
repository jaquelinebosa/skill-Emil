import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff";
import { getLatestEvent, listSellers } from "@/lib/data";
import { dateTime, displayStatus, formatPhone, STATUS_LABEL, ticketUrl, timeOnly, waLink, firstName, brl } from "@/lib/format";
import type { Registration } from "@/lib/types";
import Nav from "./Nav";
import RegActions from "./RegActions";
import SellerSelect from "./SellerSelect";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel", robots: { index: false } };

const FILTERS = [
  { key: "pendentes", label: "Aguardando pagamento" },
  { key: "pagas", label: "Pagas" },
  { key: "presentes", label: "Presentes" },
  { key: "expiradas", label: "Expiradas" },
  { key: "todas", label: "Todas" },
] as const;

type Props = { searchParams: Promise<{ f?: string; q?: string; v?: string }> };

export default async function Painel({ searchParams }: Props) {
  const staff = await requireStaff();
  if (staff.role === "checkin") redirect("/painel/checkin");
  const { f = "pendentes", q = "", v = "" } = await searchParams;

  const ev = await getLatestEvent();
  if (!ev) return <main className="page"><p>Nenhum evento cadastrado.</p></main>;

  const sellers = await listSellers(ev.id);
  const sellerName = new Map(sellers.map((s) => [s.id, s.name]));
  const { data } = await db().from("registrations").select("*").eq("event_id", ev.id).order("created_at", { ascending: false });
  const all = (data as Registration[]) ?? [];
  const withStatus = all.map((r) => ({ ...r, view: displayStatus(r) }));

  const paid = withStatus.filter((r) => r.view === "paid");
  const pendingActive = withStatus.filter((r) => r.view === "pending");
  const present = paid.filter((r) => r.checked_in_at);
  const noImage = paid.filter((r) => !r.image_consent);
  const seatsLeft = ev.capacity - paid.length - pendingActive.length;

  const term = q.trim().toLowerCase();
  const digitsTerm = term.replace(/\D/g, "");
  let list = withStatus.filter((r) => {
    switch (f) {
      case "pagas": return r.view === "paid";
      case "presentes": return !!r.checked_in_at;
      case "expiradas": return r.view === "expired" || r.view === "cancelled";
      case "todas": return true;
      default: return r.view === "pending";
    }
  });
  if (v === "org") list = list.filter((r) => !r.seller_id);
  else if (v) list = list.filter((r) => sellers.find((s) => s.id === r.seller_id)?.code === v);
  if (term) {
    list = withStatus.filter((r) =>
      r.name.toLowerCase().includes(term) || r.code.toLowerCase().includes(term) || r.email.includes(term) ||
      (digitsTerm.length >= 4 && r.phone.includes(digitsTerm)) || (r.instagram ?? "").toLowerCase().includes(term));
  }

  const isAdmin = staff.role === "admin";
  const canSell = staff.role === "admin" || staff.role === "sales";

  return (
    <main className="page wide">
      <Nav staff={staff} current="lista" eventName={ev.name} />

      {!ev.registrations_open && <div className="alert warn">As inscrições estão fechadas para o público.{isAdmin && <> <Link href="/painel/evento">Abrir em Configurar evento</Link>.</>}</div>}

      <section className="stats" aria-label="Resumo">
        <div className="stat"><b>{paid.length}</b><span>pagas</span></div>
        <div className="stat"><b>{pendingActive.length}</b><span>aguardando PIX</span></div>
        <div className="stat"><b>{Math.max(seatsLeft, 0)}</b><span>vagas livres de {ev.capacity}</span></div>
        <div className="stat"><b>{present.length}</b><span>presentes</span></div>
        <div className="stat"><b>{noImage.length}</b><span>não autorizam imagem</span></div>
        <div className="stat"><b>{brl(paid.length * ev.price_cents)}</b><span>recebido</span></div>
      </section>

      <form className="row" role="search" action="/painel">
        <input className="input" style={{ flex: "1 1 240px" }} name="q" defaultValue={q} placeholder="Buscar por nome, código, telefone ou email" aria-label="Buscar inscrição" />
        <button className="btn secondary" type="submit">Buscar</button>
        {q && <Link className="btn ghost" href="/painel">Limpar</Link>}
        {isAdmin && <a className="btn ghost" href={`/painel/exportar?evento=${ev.slug}`}>Exportar planilha</a>}
      </form>

      {!term && (
        <nav className="tabs" aria-label="Filtrar">
          {FILTERS.map((x) => <Link key={x.key} href={`/painel?f=${x.key}${v ? `&v=${v}` : ""}`} aria-current={f === x.key ? "page" : undefined}>{x.label}</Link>)}
        </nav>
      )}
      {!term && sellers.length > 0 && (
        <nav className="tabs" aria-label="Filtrar por vendedora">
          <Link href={`/painel?f=${f}`} aria-current={!v ? "page" : undefined}>Todas as vendas</Link>
          {sellers.map((s) => <Link key={s.id} href={`/painel?f=${f}&v=${s.code}`} aria-current={v === s.code ? "page" : undefined}>{s.name}</Link>)}
          <Link href={`/painel?f=${f}&v=org`} aria-current={v === "org" ? "page" : undefined}>Organização</Link>
        </nav>
      )}

      <section className="list" aria-live="polite">
        {list.length === 0 && <div className="empty">{term ? "Nenhuma inscrição encontrada." : "Nada por aqui ainda."}</div>}
        {list.map((r) => {
          const waText = r.view === "paid"
            ? `Oi ${firstName(r.name)}! Pagamento confirmado, sua vaga no ${ev.name} está garantida. Seu ingresso com QR code: ${ticketUrl(r.ticket_token)}`
            : `Oi ${firstName(r.name)}! Aqui é da organização do ${ev.name}. Vi sua inscrição ${r.code}. Os dados do PIX estão aqui: ${ticketUrl(r.ticket_token)}`;
          return (
            <article key={r.id} className="reg">
              <div className="who">
                <b>{r.name}</b>
                <span className="meta">{r.code} · {formatPhone(r.phone)} · {r.email}{r.instagram ? ` · ${r.instagram}` : ""}</span>
                <span className="meta">Inscrita em {dateTime(r.created_at)}{r.view === "pending" ? ` · paga até ${dateTime(r.expires_at)}` : ""}{r.paid_at ? ` · paga em ${dateTime(r.paid_at)}` : ""}</span>
                {r.dietary && <span className="meta">Restrição: {r.dietary}</span>}
                {isAdmin && sellers.length > 0 ? (
                  <SellerSelect registrationId={r.id} current={r.seller_id} sellers={sellers.map((s) => ({ id: s.id, name: s.name }))} locked={!!r.commission_paid_at} />
                ) : (
                  <span className="meta">Venda de {r.seller_id ? sellerName.get(r.seller_id) ?? "vendedora" : "organização"}</span>
                )}
              </div>
              <div className="tags">
                <span className={`pill ${r.view}`}>{STATUS_LABEL[r.view]}</span>
                {r.checked_in_at && <span className="pill present">Chegou {timeOnly(r.checked_in_at)}</span>}
                {!r.image_consent && <span className="pill noimg">Sem imagem</span>}
              </div>
              <div className="actions">
                <RegActions id={r.id} code={r.code} status={r.view} isAdmin={isAdmin} canSell={canSell} waParticipant={waLink(r.phone, waText)} />
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
