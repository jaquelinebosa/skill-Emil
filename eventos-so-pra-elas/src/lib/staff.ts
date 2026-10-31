import { redirect } from "next/navigation";
import { authClient } from "./supabase/server";
import { db } from "./supabase/admin";
import type { Staff, StaffRole } from "./types";

export async function currentStaff(): Promise<Staff | null> {
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: staff } = await db().from("staff").select("user_id,name,role").eq("user_id", data.user.id).maybeSingle();
  return (staff as Staff) ?? null;
}

/** Usa em páginas e ações do painel. Sem login ou sem cadastro na equipe, volta pro login. */
export async function requireStaff(roles?: StaffRole[]): Promise<Staff> {
  const staff = await currentStaff();
  if (!staff) redirect("/painel/login?erro=acesso");
  if (roles && !roles.includes(staff.role)) redirect("/painel");
  return staff;
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Admin",
  sales: "Vendas",
  checkin: "Check-in",
};
