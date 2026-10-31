"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type FormState } from "./actions";

interface Props {
  slug: string;
  askDietary: boolean;
  consentText: string;
  sellerCode: string;
}

export default function RegistrationForm({ slug, askDietary, consentText, sellerCode }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(register.bind(null, slug, sellerCode), {});
  const val = state.values ?? {};

  if (state.info) {
    return <div className="alert ok" role="status">{state.info}</div>;
  }

  return (
    <form action={action} className="stack" noValidate>
      {state.error && <div className="alert error" role="alert">{state.error}</div>}

      <div className="field">
        <label htmlFor="name">Nome completo</label>
        <input className="input" id="name" name="name" autoComplete="name" required defaultValue={val.name} />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={val.email} />
        <span className="hint">É pra cá que vão os dados do PIX e o seu ingresso.</span>
      </div>
      <div className="field">
        <label htmlFor="phone">WhatsApp</label>
        <input className="input" id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(31) 99999-9999" required defaultValue={val.phone} />
      </div>
      <div className="field">
        <label htmlFor="instagram">Instagram <span className="muted">(opcional)</span></label>
        <input className="input" id="instagram" name="instagram" placeholder="@seuperfil" autoCapitalize="none" defaultValue={val.instagram} />
        <span className="hint">Pra gente te marcar nas publicações do evento.</span>
      </div>
      {askDietary && (
        <div className="field">
          <label htmlFor="dietary">Restrição alimentar <span className="muted">(opcional)</span></label>
          <input className="input" id="dietary" name="dietary" placeholder="Ex.: vegetariana, sem lactose" defaultValue={val.dietary} />
        </div>
      )}

      <fieldset>
        <legend>Uso de imagem</legend>
        <p className="consent-text">{consentText}</p>
        <label className="choice">
          <input type="radio" name="image_consent" value="sim" defaultChecked={val.image_consent === "sim"} />
          <span>Autorizo o uso da minha imagem</span>
        </label>
        <label className="choice">
          <input type="radio" name="image_consent" value="nao" defaultChecked={val.image_consent === "nao"} />
          <span>Não autorizo o uso da minha imagem</span>
        </label>
        <span className="hint" style={{ fontSize: ".85rem", color: "var(--muted)" }}>Sua escolha não afeta a inscrição.</span>
      </fieldset>

      <label className="choice">
        <input type="checkbox" name="marketing" defaultChecked={val.marketing === "on"} />
        <span>Quero receber novidades dos próximos eventos do Só Pra Elas <span className="muted">(opcional)</span></span>
      </label>
      <label className="choice">
        <input type="checkbox" name="privacy" required />
        <span>Li e concordo com a <Link href="/privacidade" target="_blank">política de privacidade</Link></span>
      </label>

      <div className="hp" aria-hidden="true">
        <label htmlFor="website">Não preencha</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button className="btn block" type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Fazer minha inscrição"}
      </button>
    </form>
  );
}
