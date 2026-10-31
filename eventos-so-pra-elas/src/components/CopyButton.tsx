"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      window.prompt("Copie o texto:", text);
    }
  }
  return (
    <button type="button" className="btn secondary" onClick={copy}>
      {done ? "Copiado" : label}
    </button>
  );
}
