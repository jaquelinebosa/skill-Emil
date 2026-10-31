"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { authClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff";
import { getEventById, getRegistrationById, logAction } from "@/lib/data";
import { sendExistingEmail, sendTicketEmail } from "@/lib/email";
import type { Registration } from "@/lib/types";

export interface ActionResult { ok: boolean; message: string }

export async function confirmPayment(id: string): Promise<ActionResult> {
  const staff = await requireStaff(["admin", "sales"]);
  const { data, error } = await db().rpc("confirm_payment", { p_registration: id, p_actor: staff.user_id });
  if (error) {
    const m = error.message;
    if (m.includes("SOLD_OUT")) return { ok: false, message: "Essa reserva tinha expirado e as vagas acabaram. Libere uma vaga ou aumente a capacidade." };
    if (m.includes("CANCELLED")) return { ok: false, message: "Essa inscrição está cancelada." };
    return { ok: false, message: "Não foi possível confirmar. Tente de novo." };
  }
  const reg = data as Registration;
  const ev = await getEventById(reg.event_id);
  const sent = ev ? await sendTicketEmail(reg, ev) : false;
  if (sent) await logAction(reg.id, "email_ticket", staff.user_id);
  revalidatePath("/painel");
  return { ok: true, message: sent ? `${reg.code} confirmada. Ingresso enviado por email.` : `${reg.code} confirmada, mas o email não saiu. Envie o link pelo WhatsApp.` };
}

export async function resendEmail(id: string): Promise<ActionResult> {
  const staff = await requireStaff(["admin", "sales"]);
  const reg = await getRegistrationById(id);
  if (!reg) return { ok: false, message: "Inscrição não encontrada." };
  const ev = await getEventById(reg.event_id);
  const sent = ev ? await sendExistingEmail(reg, ev) : false;
  if (sent) await logAction(reg.id, "email_resent", staff.user_id);
  return { ok: sent, message: sent ? `Email reenviado para ${reg.email}.` : "O email não saiu. Confira a configuração do Resend." };
}

export async function cancelRegistration(id: string): Promise<ActionResult> {
  const staff = await requireStaff(["admin"]);
  const { data, error } = await db().from("registrations")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id).neq("status", "cancelled").select("code").maybeSingle();
  if (error || !data) return { ok: false, message: "Não foi possível cancelar." };
  await logAction(id, "cancelled", staff.user_id);
  revalidatePath("/painel");
  return { ok: true, message: `${data.code} cancelada. A vaga voltou pra venda.` };
}

export async function reopenRegistration(id: string): Promise<ActionResult> {
  // Devolve uma inscrição expirada para "aguardando pagamento" por mais um prazo.
  const staff = await requireStaff(["admin", "sales"]);
  const reg = await getRegistrationById(id);
  if (!reg) return { ok: false, message: "Inscrição não encontrada." };
  const ev = await getEventById(reg.event_id);
  if (!ev) return { ok: false, message: "Evento não encontrado." };
  const { data: taken } = await db().rpc("seats_taken", { p_event: ev.id });
  if ((taken as number) >= ev.capacity) return { ok: false, message: "Não há vagas livres pra reabrir essa reserva." };
  const expires = new Date(Date.now() + ev.pending_ttl_hours * 3600_000).toISOString();
  await db().from("registrations").update({ status: "pending", expires_at: expires }).eq("id", id).in("status", ["pending", "expired"]);
  await logAction(id, "reopened", staff.user_id);
  revalidatePath("/painel");
  return { ok: true, message: `${reg.code} reaberta por mais ${ev.pending_ttl_hours} horas.` };
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/painel/login");
}
