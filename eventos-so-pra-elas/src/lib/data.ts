import { db } from "./supabase/admin";
import type { EventRow, Registration, Seller } from "./types";

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const { data } = await db().from("events").select("*").eq("slug", slug).maybeSingle();
  return (data as EventRow) ?? null;
}

export async function getEventById(id: string): Promise<EventRow | null> {
  const { data } = await db().from("events").select("*").eq("id", id).maybeSingle();
  return (data as EventRow) ?? null;
}

export async function getLatestEvent(): Promise<EventRow | null> {
  const { data } = await db().from("events").select("*").order("event_date", { ascending: false }).limit(1).maybeSingle();
  return (data as EventRow) ?? null;
}

export async function listEvents(): Promise<EventRow[]> {
  const { data } = await db().from("events").select("*").order("event_date", { ascending: false });
  return (data as EventRow[]) ?? [];
}

export async function getRegistrationByToken(token: string): Promise<Registration | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const { data } = await db().from("registrations").select("*").eq("ticket_token", token).maybeSingle();
  return (data as Registration) ?? null;
}

export async function getRegistrationById(id: string): Promise<Registration | null> {
  const { data } = await db().from("registrations").select("*").eq("id", id).maybeSingle();
  return (data as Registration) ?? null;
}

export async function seatsTaken(eventId: string): Promise<number> {
  const { data } = await db().rpc("seats_taken", { p_event: eventId });
  return (data as number) ?? 0;
}

export async function logAction(registrationId: string, action: string, actor: string | null, details?: object) {
  await db().from("registration_log").insert({ registration_id: registrationId, action, actor, details: details ?? null });
}

export async function listSellers(eventId: string): Promise<Seller[]> {
  const { data } = await db().from("sellers").select("*").eq("event_id", eventId).order("name");
  return ((data as Seller[]) ?? []).map((s) => ({ ...s, commission_percent: Number(s.commission_percent) }));
}

export async function getSellerByCode(eventId: string, code: string): Promise<Seller | null> {
  if (!/^[a-z0-9-]{2,30}$/.test(code)) return null;
  const { data } = await db().from("sellers").select("*").eq("event_id", eventId).eq("code", code).eq("active", true).maybeSingle();
  return data ? { ...(data as Seller), commission_percent: Number((data as Seller).commission_percent) } : null;
}

export async function getSellerById(id: string | null): Promise<Seller | null> {
  if (!id) return null;
  const { data } = await db().from("sellers").select("*").eq("id", id).maybeSingle();
  return data ? { ...(data as Seller), commission_percent: Number((data as Seller).commission_percent) } : null;
}

/** WhatsApp que recebe o comprovante: o da vendedora, se tiver; senão o do evento. */
export function contactWhatsapp(ev: EventRow, seller: Seller | null): { phone: string | null; name: string | null } {
  if (seller?.whatsapp) return { phone: seller.whatsapp, name: seller.name };
  return { phone: ev.sales_whatsapp, name: null };
}
