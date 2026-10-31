"use client";

import { useState, useTransition } from "react";
import { setSeller } from "./comissoes/actions";

export default function SellerSelect({ registrationId, current, sellers, locked }: {
  registrationId: string; current: string | null; sellers: { id: string; name: string }[]; locked: boolean;
}) {
  const [value, setValue] = useState(current ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="row" style={{ gap: 6 }}>
      <label className="small muted" htmlFor={`sel-${registrationId}`}>Venda de</label>
      <select id={`sel-${registrationId}`} className="input" style={{ minHeight: 36, padding: "4px 8px", width: "auto" }}
        value={value} disabled={pending || locked}
        onChange={(e) => {
          const next = e.target.value;
          const prev = value;
          setValue(next);
          start(async () => {
            const r = await setSeller(registrationId, next || null);
            setMsg(r);
            if (!r.ok) setValue(prev);
          });
        }}>
        <option value="">Organização</option>
        {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {locked && <span className="small muted">comissão já paga</span>}
      {msg && !msg.ok && <span className="small" style={{ color: "var(--bad)" }}>{msg.message}</span>}
    </span>
  );
}
