"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff";
import { getLatestEvent, logAction } from "@/lib/data";
import { brl, digits } from "@/lib/format";

export async function payCommission(sellerId: string): Promise<{ ok: boolean; message: string }> {
  const staff = await requireStaff(["admin"]);
  const { data, error } = await db().from("registrations")
    .update({ commission_paid_at: new Date().toISOString() })
    .eq("seller_id", sellerId).eq("status", "paid").is("commission_paid_at", null)
    .select("id, commission_cents");
  if (error) return { ok: false, message: "Não foi possível registrar o pagamento." };
  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + (r.commission_cents as number), 0);
  await Promise.all(rows.map((r) => logAction(r.id as string, "commission_paid", staff.user_id)));
  revalidatePath("/painel/comissoes");
  return { ok: true, message: rows.length ? `Pagamento de ${brl(total)} registrado (${rows.length} ingressos).` : "Não havia comissão pendente." };
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  if (!email) return null;
  for (let page = 1; page <= 10; page++) {
    const { data } = await db().auth.admin.listUsers({ page, perPage: 200 });
    const hit = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (!data || data.users.length < 200) break;
  }
  return null;
}

export async function saveSeller(form: FormData) {
  await requireStaff(["admin"]);
  const ev = await getLatestEvent();
  if (!ev) redirect("/painel");
  const s = (k: string) => String(form.get(k) ?? "").trim();
  const id = s("id");
  const name = s("name");
  const code = s("code").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9-]/g, "");
  const percent = Number(s("percent").replace(",", "."));
  const wa = digits(s("whatsapp"));
  const loginEmail = s("login_email");
  if (!name || code.length < 2 || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    redirect("/painel/comissoes?erro=dados");
  }
  const staffUserId = loginEmail ? await findUserIdByEmail(loginEmail) : null;
  if (loginEmail && !staffUserId) redirect("/painel/comissoes?erro=login");

  const row = {
    event_id: ev.id, name, code, commission_percent: percent,
    whatsapp: wa ? (wa.startsWith("55") ? wa : `55${wa}`) : null,
    staff_user_id: staffUserId,
    active: id ? form.get("active") === "on" : true,
  };
  const { error } = id
    ? await db().from("sellers").update(row).eq("id", id)
    : await db().from("sellers").insert(row);
  if (error) redirect(`/painel/comissoes?erro=${error.code === "23505" ? "codigo" : "dados"}`);
  revalidatePath("/painel/comissoes");
  redirect("/painel/comissoes?ok=1");
}

export async function setSeller(registrationId: string, sellerId: string | null): Promise<{ ok: boolean; message: string }> {
  const staff = await requireStaff(["admin"]);
  const { error } = await db().rpc("set_seller", { p_registration: registrationId, p_seller: sellerId, p_actor: staff.user_id });
  if (error) {
    if (error.message.includes("COMMISSION_ALREADY_PAID")) return { ok: false, message: "A comissão dessa venda já foi paga." };
    return { ok: false, message: "Não foi possível trocar a vendedora." };
  }
  revalidatePath("/painel");
  return { ok: true, message: "Vendedora atualizada." };
}
