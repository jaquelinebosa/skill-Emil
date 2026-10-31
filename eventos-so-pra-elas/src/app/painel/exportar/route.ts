import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase/admin";
import { currentStaff } from "@/lib/staff";
import { getEventBySlug, listSellers } from "@/lib/data";
import { brl, dateTime, displayStatus, formatPhone, STATUS_LABEL } from "@/lib/format";
import type { Registration } from "@/lib/types";

export async function GET(req: NextRequest) {
  const staff = await currentStaff();
  if (!staff || staff.role !== "admin") return new NextResponse("Sem permissão", { status: 403 });
  const ev = await getEventBySlug(req.nextUrl.searchParams.get("evento") ?? "");
  if (!ev) return new NextResponse("Evento não encontrado", { status: 404 });

  const { data } = await db().from("registrations").select("*").eq("event_id", ev.id).order("seq");
  const rows = (data as Registration[]) ?? [];
  const sellerName = new Map((await listSellers(ev.id)).map((s) => [s.id, s.name]));
  const cell = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // evita fórmulas ao abrir no Excel
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const header = ["Código", "Nome", "Email", "WhatsApp", "Instagram", "Restrição alimentar", "Status", "Vendedora", "Comissão", "Comissão paga", "Autoriza imagem", "Versão do termo", "Aceita novidades", "Inscrita em", "Paga em", "Chegada"];
  const lines = rows.map((r) => [
    r.code, r.name, r.email, formatPhone(r.phone), r.instagram, r.dietary, STATUS_LABEL[displayStatus(r)],
    r.seller_id ? sellerName.get(r.seller_id) ?? "" : "Organização",
    r.status === "paid" && r.commission_cents ? brl(r.commission_cents) : "",
    r.commission_paid_at ? dateTime(r.commission_paid_at) : "",
    r.image_consent ? "Sim" : "Não", r.image_consent_version, r.marketing_consent ? "Sim" : "Não",
    dateTime(r.created_at), r.paid_at ? dateTime(r.paid_at) : "", r.checked_in_at ? dateTime(r.checked_in_at) : "",
  ].map(cell).join(";"));
  const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscricoes-${ev.slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
