import { db } from "./supabase/admin";
import type { EventRow, Registration } from "./types";

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
