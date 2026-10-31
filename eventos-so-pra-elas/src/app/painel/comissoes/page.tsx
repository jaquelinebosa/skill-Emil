import type { Metadata } from "next";
import { db } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff";
import { getLatestEvent, listSellers } from "@/lib/data";
import { brl, dateTime, displayStatus, siteUrl, STATUS_LABEL } from "@/lib/format";
import type { Registration, Seller } from "@/lib/types";
import CopyButton from "@/components/CopyButton";
import Nav from "../Nav";
import PayButton from "./PayButton";
import { saveSeller } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comissões", robots: { index: false } };

const ERRORS: Record<string, string> = {
  dados: "Confira o nome, o código do link (letras minúsculas, números e hífen) e o percentual.",
  codigo: "Já existe uma vendedora com esse código de link.",
  login: "Não encontrei um acesso ao painel com esse email. Crie o acesso primeiro.",
};

function summarize(regs: Registration[]) {
  const paid = regs.filter((r) => r.status === "paid");
  const commission = paid.reduce((s, r) => s + r.commission_cents, 0);
  const paidOut = paid.filter((r) => r.commission_paid_at).reduce((s, r) => s + r.commission_cents, 0);
  return {
    paidCount: paid.length,
    sold: paid.reduce((s, r) => s + r.amount_cents, 0),
    waiting: regs.filter((r) => displayStatus(r) === "pending").length,
    commission, paidOut, due: commission - paidOut,
  };
}

export default async function Comissoes({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const staff = await requireStaff(["admin", "sales"]);
  const { ok, erro } = await searchParams;
  const ev = await getLatestEvent();
  if (!ev) return <main className="page"><p>Nenhum evento cadastrado.</p></main>;

  const isAdmin = staff.role === "admin";
  const allSellers = await listSellers(ev.id);
  const sellers: Seller[] = isAdmin ? allSellers : allSellers.filter((s) => s.staff_user_id === staff.user_id);
  const { data } = await db().from("registrations").select("*").eq("event_id", ev.id).neq("status", "cancelled").order("created_at", { ascending: false });
  const regs = (data as Registration[]) ?? [];
  const org = summarize(regs.filter((r) => !r.seller_id));

  return (
    <main className="page wide">
      <Nav staff={staff} current="comissoes" eventName={ev.name} />
      {ok && <div className="alert ok" role="status">Vendedora salva.</div>}
      {erro && <div className="alert error" role="alert">{ERRORS[erro] ?? ERRORS.dados}</div>}

      {!isAdmin && sellers.length === 0 && (
        <div className="empty">Seu acesso ainda não está ligado a uma vendedora. Peça pra Jaqueline fazer essa ligação.</div>
      )}

      {sellers.map((s) => {
        const mine = regs.filter((r) => r.seller_id === s.id);
        const t = summarize(mine);
        const link = `${siteUrl()}/${ev.slug}?v=${s.code}`;
        return (
          <section key={s.id} className="stack">
            <div className="topbar">
              <div>
                <h2>{s.name}{!s.active && <span className="pill expired" style={{ marginLeft: 8 }}>inativa</span>}</h2>
                <p className="small muted">Comissão de {s.commission_percent.toLocaleString("pt-BR")}% sobre vendas pagas</p>
              </div>
              <div className="row"><code className="small" style={{ overflowWrap: "anywhere" }}>{link}</code><CopyButton text={link} label="Copiar link" /></div>
            </div>
            <div className="stats">
              <div className="stat"><b>{t.paidCount}</b><span>ingressos pagos</span></div>
              <div className="stat"><b>{t.waiting}</b><span>aguardando PIX</span></div>
              <div className="stat"><b>{brl(t.sold)}</b><span>vendido</span></div>
              <div className="stat"><b>{brl(t.commission)}</b><span>comissão total</span></div>
              <div className="stat"><b>{brl(t.paidOut)}</b><span>comissão já paga</span></div>
              <div className="stat"><b>{brl(t.due)}</b><span>a pagar</span></div>
            </div>
            {isAdmin && t.due > 0 && <PayButton sellerId={s.id} label={brl(t.due)} name={s.name} />}
            <details>
              <summary className="small" style={{ cursor: "pointer" }}>Ver vendas ({mine.length})</summary>
              <div className="list" style={{ marginTop: 10 }}>
                {mine.length === 0 && <div className="empty">Nenhuma venda por este link ainda.</div>}
                {mine.map((r) => {
                  const st = displayStatus(r);
                  return (
                    <div key={r.id} className="reg">
                      <div className="who"><b>{r.name}</b><span className="meta">{r.code} · inscrita em {dateTime(r.created_at)}</span></div>
                      <div className="tags">
                        <span className={`pill ${st}`}>{STATUS_LABEL[st]}</span>
                        {st === "paid" && <span className="pill present">{brl(r.commission_cents)}{r.commission_paid_at ? " · paga" : ""}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </section>
        );
      })}

      {isAdmin && (
        <>
          <section className="stack">
            <h2>Organização</h2>
            <p className="small muted">Vendas pelo link geral, sem comissão.</p>
            <div className="stats">
              <div className="stat"><b>{org.paidCount}</b><span>ingressos pagos</span></div>
              <div className="stat"><b>{org.waiting}</b><span>aguardando PIX</span></div>
              <div className="stat"><b>{brl(org.sold)}</b><span>vendido</span></div>
            </div>
          </section>

          <section className="stack">
            <h2>Vendedoras</h2>
            {allSellers.map((s) => (
              <form key={s.id} action={saveSeller} className="card stack">
                <input type="hidden" name="id" value={s.id} />
                <div className="stats">
                  <div className="field"><label htmlFor={`n-${s.id}`}>Nome</label><input className="input" id={`n-${s.id}`} name="name" defaultValue={s.name} /></div>
                  <div className="field"><label htmlFor={`c-${s.id}`}>Código do link</label><input className="input" id={`c-${s.id}`} name="code" defaultValue={s.code} /></div>
                  <div className="field"><label htmlFor={`p-${s.id}`}>Comissão (%)</label><input className="input" id={`p-${s.id}`} name="percent" inputMode="decimal" defaultValue={String(s.commission_percent).replace(".", ",")} /></div>
                  <div className="field"><label htmlFor={`w-${s.id}`}>WhatsApp</label><input className="input" id={`w-${s.id}`} name="whatsapp" type="tel" defaultValue={s.whatsapp ?? ""} /></div>
                  <div className="field"><label htmlFor={`l-${s.id}`}>Email do acesso ao painel</label><input className="input" id={`l-${s.id}`} name="login_email" type="email" placeholder="opcional" /></div>
                </div>
                <span className="small muted">{s.staff_user_id ? "Acesso ao painel ligado: ela vê as próprias comissões. Pra trocar, informe outro email." : "Sem acesso ligado. Informe o email do login dela pra ela ver as próprias comissões."}</span>
                <div className="row">
                  <label className="row small"><input type="checkbox" name="active" defaultChecked={s.active} /> Link ativo</label>
                  <button className="btn sm" type="submit">Salvar</button>
                </div>
              </form>
            ))}
            <form action={saveSeller} className="card stack">
              <h3>Nova vendedora</h3>
              <div className="stats">
                <div className="field"><label htmlFor="nn">Nome</label><input className="input" id="nn" name="name" required /></div>
                <div className="field"><label htmlFor="nc">Código do link</label><input className="input" id="nc" name="code" placeholder="ex.: fernanda" required /></div>
                <div className="field"><label htmlFor="np">Comissão (%)</label><input className="input" id="np" name="percent" inputMode="decimal" defaultValue="10" /></div>
                <div className="field"><label htmlFor="nw">WhatsApp</label><input className="input" id="nw" name="whatsapp" type="tel" /></div>
                <div className="field"><label htmlFor="nl">Email do acesso ao painel</label><input className="input" id="nl" name="login_email" type="email" placeholder="opcional" /></div>
              </div>
              <button className="btn sm" type="submit" style={{ alignSelf: "flex-start" }}>Adicionar</button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
