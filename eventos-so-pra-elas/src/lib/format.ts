const TZ = "America/Sao_Paulo";

export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function eventDateLong(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00-03:00`);
  const s = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function eventDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: TZ,
  });
}

export function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}

export function digits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Normaliza telefone brasileiro para o formato do WhatsApp (55 + DDD + número). */
export function waNumber(phone: string): string {
  const d = digits(phone);
  if (d.startsWith("55") && d.length >= 12) return d;
  return `55${d}`;
}

export function formatPhone(phone: string): string {
  const d = digits(phone).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function ticketUrl(token: string): string {
  return `${siteUrl()}/i/${token}`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function isPendingActive(r: { status: string; expires_at: string }): boolean {
  return r.status === "pending" && new Date(r.expires_at).getTime() > Date.now();
}

/** Status exibido: pendente vencida aparece como expirada mesmo antes da rotina diária rodar. */
export function displayStatus(r: { status: string; expires_at: string }) {
  if (r.status === "pending" && !isPendingActive(r)) return "expired" as const;
  return r.status as "pending" | "paid" | "expired" | "cancelled";
}

export const STATUS_LABEL = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  expired: "Expirada",
  cancelled: "Cancelada",
} as const;
