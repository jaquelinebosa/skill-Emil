"use client";

import { useState, useTransition } from "react";
import { cancelRegistration, confirmPayment, reopenRegistration, resendEmail, type ActionResult } from "./actions";

interface Props {
  id: string;
  code: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  isAdmin: boolean;
  canSell: boolean;
  waParticipant: string;
}

export default function RegActions({ id, code, status, isAdmin, canSell, waParticipant }: Props) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [confirming, setConfirming] = useState<null | "pay" | "cancel">(null);

  const run = (fn: () => Promise<ActionResult>) => start(async () => { setResult(await fn()); setConfirming(null); });

  if (confirming) {
    return (
      <div className="row">
        <span className="small">{confirming === "pay" ? `Confirmar o pagamento de ${code}?` : `Cancelar ${code}? A vaga volta pra venda.`}</span>
        <button className={`btn sm ${confirming === "cancel" ? "danger" : ""}`} disabled={pending}
          onClick={() => run(() => confirming === "pay" ? confirmPayment(id) : cancelRegistration(id))}>
          {pending ? "Aguarde…" : "Sim"}
        </button>
        <button className="btn sm secondary" disabled={pending} onClick={() => setConfirming(null)}>Não</button>
      </div>
    );
  }

  return (
    <>
      {canSell && (status === "pending" || status === "expired") && (
        <button className="btn sm" disabled={pending} onClick={() => setConfirming("pay")}>Confirmar pagamento</button>
      )}
      <a className="btn sm secondary" href={waParticipant} target="_blank" rel="noopener noreferrer">
        {status === "paid" ? "Enviar ingresso no WhatsApp" : "WhatsApp"}
      </a>
      {canSell && status !== "cancelled" && status !== "expired" && (
        <button className="btn sm ghost" disabled={pending} onClick={() => run(() => resendEmail(id))}>Reenviar email</button>
      )}
      {canSell && status === "expired" && (
        <button className="btn sm ghost" disabled={pending} onClick={() => run(() => reopenRegistration(id))}>Reabrir reserva</button>
      )}
      {isAdmin && status !== "cancelled" && (
        <button className="btn sm ghost" style={{ color: "var(--bad)" }} disabled={pending} onClick={() => setConfirming("cancel")}>Cancelar</button>
      )}
      {result && <span className={`small`} style={{ color: result.ok ? "var(--ok)" : "var(--bad)", flexBasis: "100%" }} role="status">{result.message}</span>}
    </>
  );
}
