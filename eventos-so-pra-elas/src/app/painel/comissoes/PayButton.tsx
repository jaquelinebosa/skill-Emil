"use client";

import { useState, useTransition } from "react";
import { payCommission } from "./actions";

export default function PayButton({ sellerId, label, name }: { sellerId: string; label: string; name: string }) {
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (msg) return <span className="small" role="status" style={{ color: "var(--ok)" }}>{msg}</span>;
  if (!asking) return <button className="btn sm" onClick={() => setAsking(true)}>Registrar pagamento de {label}</button>;
  return (
    <div className="row">
      <span className="small">Confirmar que {name} recebeu {label}?</span>
      <button className="btn sm" disabled={pending} onClick={() => start(async () => setMsg((await payCommission(sellerId)).message))}>{pending ? "Aguarde…" : "Sim"}</button>
      <button className="btn sm secondary" disabled={pending} onClick={() => setAsking(false)}>Não</button>
    </div>
  );
}
