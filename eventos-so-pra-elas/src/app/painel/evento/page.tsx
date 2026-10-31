import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff";
import { getLatestEvent } from "@/lib/data";
import { digits, siteUrl } from "@/lib/format";
import Nav from "../Nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configurar evento", robots: { index: false } };

async function save(form: FormData) {
  "use server";
  await requireStaff(["admin"]);
  const ev = await getLatestEvent();
  if (!ev) redirect("/painel");
  const s = (k: string) => String(form.get(k) ?? "").trim();
  const price = Math.round(Number(s("price").replace(/\./g, "").replace(",", ".")) * 100);
  const capacity = parseInt(s("capacity"), 10);
  const ttl = parseInt(s("ttl"), 10);
  const consent = s("consent");
  const wa = digits(s("whatsapp"));
  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(capacity) || capacity < 1 || !Number.isFinite(ttl) || ttl < 1 || consent.length < 40) {
    redirect("/painel/evento?erro=1");
  }
  const consentChanged = consent !== ev.image_consent_text;
  const nextVersion = consentChanged ? `v${(parseInt(ev.image_consent_version.replace(/\D/g, ""), 10) || 1) + 1}` : ev.image_consent_version;
  await db().from("events").update({
    name: s("name") || ev.name,
    start_time: s("start_time") || null,
    venue_name: s("venue_name") || null,
    venue_address: s("venue_address") || null,
    price_cents: price,
    capacity,
    pending_ttl_hours: ttl,
    pix_key: s("pix_key") || null,
    pix_holder: s("pix_holder") || null,
    sales_whatsapp: wa ? (wa.startsWith("55") ? wa : `55${wa}`) : null,
    menu_info: s("menu_info") || null,
    ask_dietary: form.get("ask_dietary") === "on",
    image_consent_text: consent,
    image_consent_version: nextVersion,
    registrations_open: form.get("open") === "on",
  }).eq("id", ev.id);
  revalidatePath("/", "layout");
  redirect("/painel/evento?ok=1");
}

export default async function EventoPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const staff = await requireStaff(["admin"]);
  const ev = await getLatestEvent();
  const { ok, erro } = await searchParams;
  if (!ev) return <main className="page"><p>Nenhum evento cadastrado.</p></main>;
  const missing = [!ev.pix_key && "chave PIX", !ev.sales_whatsapp && "WhatsApp da Fernanda", !ev.start_time && "horário", !ev.venue_address && "endereço"].filter(Boolean);

  return (
    <main className="page">
      <Nav staff={staff} current="evento" eventName={ev.name} />
      {ok && <div className="alert ok" role="status">Alterações salvas.</div>}
      {erro && <div className="alert error" role="alert">Confira valor, vagas, prazo e o texto do termo de imagem.</div>}
      {missing.length > 0 && <div className="alert warn">Falta preencher: {missing.join(", ")}.</div>}
      <p className="small muted">Link público da inscrição: <a href={`${siteUrl()}/${ev.slug}`}>{siteUrl()}/{ev.slug}</a></p>

      <form action={save} className="stack">
        <label className="choice">
          <input type="checkbox" name="open" defaultChecked={ev.registrations_open} />
          <span><b>Inscrições abertas</b><br /><span className="small muted">Desmarque pra fechar as vendas a qualquer momento.</span></span>
        </label>

        <h2>Evento</h2>
        <div className="field"><label htmlFor="name">Nome</label><input className="input" id="name" name="name" defaultValue={ev.name} /></div>
        <div className="field"><label htmlFor="start_time">Horário</label><input className="input" id="start_time" name="start_time" placeholder="Ex.: 19h às 22h" defaultValue={ev.start_time ?? ""} /></div>
        <div className="field"><label htmlFor="venue_name">Local</label><input className="input" id="venue_name" name="venue_name" defaultValue={ev.venue_name ?? ""} /></div>
        <div className="field"><label htmlFor="venue_address">Endereço completo</label><input className="input" id="venue_address" name="venue_address" defaultValue={ev.venue_address ?? ""} /></div>
        <div className="field"><label htmlFor="menu_info">Cardápio</label><textarea className="input" id="menu_info" name="menu_info" defaultValue={ev.menu_info ?? ""} placeholder="Aparece na página de inscrição e no ingresso. Pode deixar em branco." /></div>
        <label className="choice"><input type="checkbox" name="ask_dietary" defaultChecked={ev.ask_dietary} /><span>Perguntar restrição alimentar no formulário</span></label>

        <h2>Vendas</h2>
        <div className="field"><label htmlFor="price">Valor do ingresso (R$)</label><input className="input" id="price" name="price" inputMode="decimal" defaultValue={(ev.price_cents / 100).toFixed(2).replace(".", ",")} /></div>
        <div className="field"><label htmlFor="capacity">Vagas</label><input className="input" id="capacity" name="capacity" type="number" min={1} defaultValue={ev.capacity} /></div>
        <div className="field"><label htmlFor="ttl">Prazo pra pagar (horas)</label><input className="input" id="ttl" name="ttl" type="number" min={1} defaultValue={ev.pending_ttl_hours} /></div>
        <div className="field"><label htmlFor="pix_key">Chave PIX</label><input className="input" id="pix_key" name="pix_key" defaultValue={ev.pix_key ?? ""} /></div>
        <div className="field"><label htmlFor="pix_holder">Nome de quem recebe o PIX</label><input className="input" id="pix_holder" name="pix_holder" defaultValue={ev.pix_holder ?? ""} /></div>
        <div className="field"><label htmlFor="whatsapp">WhatsApp que recebe os comprovantes</label><input className="input" id="whatsapp" name="whatsapp" type="tel" placeholder="(31) 99999-9999" defaultValue={ev.sales_whatsapp ?? ""} /></div>

        <h2>Termo de uso de imagem</h2>
        <div className="field">
          <label htmlFor="consent">Texto ({ev.image_consent_version})</label>
          <textarea className="input" id="consent" name="consent" rows={6} defaultValue={ev.image_consent_text} />
          <span className="hint">Se mudar o texto, ele vira uma nova versão. Quem já se inscreveu continua registrada com a versão que aceitou.</span>
        </div>

        <button className="btn block" type="submit">Salvar</button>
      </form>
    </main>
  );
}
