import Link from "next/link";
import { signOut } from "./actions";
import { ROLE_LABEL } from "@/lib/staff";
import type { Staff } from "@/lib/types";

export default function Nav({ staff, current, eventName }: { staff: Staff; current: "lista" | "checkin" | "evento" | "comissoes"; eventName?: string }) {
  const items = [
    { key: "lista", href: "/painel", label: "Inscrições", show: staff.role !== "checkin" },
    { key: "checkin", href: "/painel/checkin", label: "Check-in", show: true },
    { key: "comissoes", href: "/painel/comissoes", label: staff.role === "admin" ? "Comissões" : "Minhas comissões", show: staff.role !== "checkin" },
    { key: "evento", href: "/painel/evento", label: "Configurar evento", show: staff.role === "admin" },
  ];
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="topbar">
        <div>
          <span className="eyebrow">Painel{eventName ? ` · ${eventName}` : ""}</span>
          <p className="small muted">{staff.name} · {ROLE_LABEL[staff.role]}</p>
        </div>
        <form action={signOut}><button className="btn sm secondary" type="submit">Sair</button></form>
      </div>
      <nav className="tabs" aria-label="Seções do painel">
        {items.filter((i) => i.show).map((i) => (
          <Link key={i.key} href={i.href} aria-current={current === i.key ? "page" : undefined}>{i.label}</Link>
        ))}
      </nav>
    </div>
  );
}
