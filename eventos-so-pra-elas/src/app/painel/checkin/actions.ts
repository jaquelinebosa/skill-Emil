"use server";

import { db } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/staff";
import { getLatestEvent } from "@/lib/data";
import type { Registration } from "@/lib/types";

export type CheckInResult =
  | { result: "ok" | "already"; name: string; code: string; checked_in_at: string; image_consent: boolean; dietary?: string | null }
  | { result: "not_paid"; name: string; code: string; status: string }
  | { result: "not_found" }
  | { result: "invalid" };

function extractToken(raw: string): string | null {
  const m = raw.trim().match(/([a-f0-9]{48})/);
  return m ? m[1] : null;
}

export async function checkInScan(raw: string): Promise<CheckInResult> {
  const staff = await requireStaff();
  const token = extractToken(raw);
  if (!token) return { result: "invalid" };
  const { data, error } = await db().rpc("check_in", { p_token: token, p_actor: staff.user_id });
  if (error) throw new Error("Falha no check-in");
  return data as CheckInResult;
}

export async function checkInById(id: string): Promise<CheckInResult> {
  const staff = await requireStaff();
  const { data: reg } = await db().from("registrations").select("ticket_token").eq("id", id).maybeSingle();
  if (!reg) return { result: "not_found" };
  const { data, error } = await db().rpc("check_in", { p_token: reg.ticket_token, p_actor: staff.user_id });
  if (error) throw new Error("Falha no check-in");
  return data as CheckInResult;
}

export interface SearchHit { id: string; name: string; code: string; phone: string; status: string; checked_in_at: string | null; image_consent: boolean }

export async function searchAttendees(q: string): Promise<SearchHit[]> {
  await requireStaff();
  const ev = await getLatestEvent();
  const term = q.trim();
  if (!ev || term.length < 2) return [];
  const digits = term.replace(/\D/g, "");
  const safe = term.replace(/[%_,()]/g, " ");
  const ors = [`name.ilike.%${safe}%`, `code.ilike.%${safe}%`];
  if (digits.length >= 4) ors.push(`phone.like.%${digits}%`);
  const { data } = await db().from("registrations")
    .select("id,name,code,phone,status,checked_in_at,image_consent")
    .eq("event_id", ev.id).neq("status", "cancelled").or(ors.join(",")).order("name").limit(15);
  return (data as Pick<Registration, "id" | "name" | "code" | "phone" | "status" | "checked_in_at" | "image_consent">[]) ?? [];
}

export async function checkInCounts(): Promise<{ present: number; paid: number }> {
  await requireStaff();
  const ev = await getLatestEvent();
  if (!ev) return { present: 0, paid: 0 };
  const base = () => db().from("registrations").select("id", { count: "exact", head: true }).eq("event_id", ev.id).eq("status", "paid");
  const [{ count: paid }, { count: present }] = await Promise.all([base(), base().not("checked_in_at", "is", null)]);
  return { present: present ?? 0, paid: paid ?? 0 };
}
