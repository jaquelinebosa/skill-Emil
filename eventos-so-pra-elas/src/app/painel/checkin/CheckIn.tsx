"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { checkInById, checkInCounts, checkInScan, searchAttendees, type CheckInResult, type SearchHit } from "./actions";

function timeOnly(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

function ResultCard({ r, onNext }: { r: CheckInResult; onNext: () => void }) {
  let tone = "bad", status = "", name = "", extra: React.ReactNode = null;
  if (r.result === "ok") {
    tone = "ok"; status = "Presença confirmada"; name = r.name;
    extra = (<>
      {!r.image_consent && <span className="pill noimg" style={{ fontSize: "1rem" }}>Não autoriza imagem: entregar pulseira</span>}
      {r.dietary && <span className="small">Restrição: {r.dietary}</span>}
    </>);
  } else if (r.result === "already") {
    tone = "warn"; status = `Já entrou às ${timeOnly(r.checked_in_at)}`; name = r.name;
    extra = !r.image_consent ? <span className="pill noimg">Não autoriza imagem</span> : null;
  } else if (r.result === "not_paid") {
    status = r.status === "cancelled" ? "Inscrição cancelada" : "Pagamento não confirmado"; name = r.name;
    extra = <span className="small">Encaminhe pra Fernanda.</span>;
  } else if (r.result === "not_found") {
    status = "Ingresso não encontrado";
  } else {
    status = "Esse QR code não é um ingresso";
  }
  return (
    <div className={`result ${tone}`} role="status" aria-live="assertive">
      <span className="status">{status}</span>
      {name && <span className="big">{name}</span>}
      {"code" in r && <span className="small">{r.code}</span>}
      {extra}
      <button className="btn" style={{ marginTop: 8 }} onClick={onNext} autoFocus>Ler próximo</button>
    </div>
  );
}

export default function CheckIn() {
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ present: number; paid: number } | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, start] = useTransition();
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lockRef = useRef(false);

  const refreshCounts = useCallback(() => { checkInCounts().then(setCounts).catch(() => {}); }, []);

  const handle = useCallback(async (fn: () => Promise<CheckInResult>) => {
    try {
      const r = await fn();
      setResult(r);
      if ("vibrate" in navigator) navigator.vibrate(r.result === "ok" ? 80 : [60, 60, 60]);
      refreshCounts();
    } catch {
      setResult({ result: "not_found" });
    }
  }, [refreshCounts]);

  useEffect(() => {
    let cancelled = false;
    refreshCounts();
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.75); return { width: s, height: s }; } },
          (text) => {
            if (lockRef.current) return;
            lockRef.current = true;
            scanner.pause(true);
            handle(() => checkInScan(text));
          },
          () => {},
        );
      } catch {
        setCamError("Não consegui abrir a câmera. Permita o acesso à câmera no navegador ou use a busca por nome abaixo.");
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) s.stop().catch(() => {}).finally(() => s.clear());
    };
  }, [handle, refreshCounts]);

  function next() {
    setResult(null);
    lockRef.current = false;
    try { scannerRef.current?.resume(); } catch { /* câmera não estava pausada */ }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length >= 2) searchAttendees(q).then(setHits).catch(() => setHits([]));
      else setHits([]);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="stack" style={{ gap: 20 }}>
      {counts && <p className="muted" style={{ textAlign: "center" }}><b style={{ color: "var(--fg)", fontSize: "1.2rem" }}>{counts.present}</b> de {counts.paid} pagas já chegaram</p>}

      <div style={{ position: "relative" }}>
        <div id="qr-reader" className="scanner" hidden={!!result || !!camError} />
        {result && <ResultCard r={result} onNext={next} />}
        {camError && !result && <div className="alert warn">{camError}</div>}
      </div>

      <section className="stack">
        <h2>Buscar por nome ou telefone</h2>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digite o nome, código ou final do telefone" aria-label="Buscar participante" />
        <div className="list">
          {hits.map((h) => (
            <div key={h.id} className="reg">
              <div className="who">
                <b>{h.name}</b>
                <span className="meta">{h.code} · final {h.phone.slice(-4)}</span>
              </div>
              <div className="tags">
                {h.status !== "paid" && <span className="pill pending">Não pago</span>}
                {h.checked_in_at && <span className="pill present">Chegou {timeOnly(h.checked_in_at)}</span>}
                {!h.image_consent && <span className="pill noimg">Sem imagem</span>}
              </div>
              {h.status === "paid" && !h.checked_in_at && (
                <div className="actions">
                  <button className="btn sm" disabled={busy} onClick={() => start(async () => {
                    lockRef.current = true;
                    try { scannerRef.current?.pause(true); } catch { /* sem câmera */ }
                    await handle(() => checkInById(h.id));
                    setQ("");
                  })}>Confirmar presença</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
