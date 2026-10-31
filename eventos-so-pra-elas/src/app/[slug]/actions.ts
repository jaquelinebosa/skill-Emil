"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { getEventBySlug } from "@/lib/data";
import { sendExistingEmail, sendPendingEmail } from "@/lib/email";
import { digits } from "@/lib/format";
import type { Registration } from "@/lib/types";

export interface FormState {
  error?: string;
  info?: string;
  values?: Record<string, string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function register(slug: string, sellerCode: string, _prev: FormState, form: FormData): Promise<FormState> {
  const v = (k: string) => String(form.get(k) ?? "").trim();
  const values = {
    name: v("name"), email: v("email"), phone: v("phone"), instagram: v("instagram"),
    dietary: v("dietary"), image_consent: v("image_consent"), marketing: v("marketing"),
  };

  // honeypot: robôs preenchem campos escondidos
  if (v("website")) return { info: "Inscrição recebida." };

  if (values.name.length < 3 || !values.name.includes(" ")) return { error: "Informe seu nome completo.", values };
  if (!EMAIL_RE.test(values.email)) return { error: "Confira o email: ele parece incompleto.", values };
  const phone = digits(values.phone);
  if (phone.length < 10 || phone.length > 13) return { error: "Informe o WhatsApp com DDD, por exemplo (31) 99999-9999.", values };
  if (values.image_consent !== "sim" && values.image_consent !== "nao") return { error: "Escolha se autoriza ou não o uso da sua imagem.", values };
  if (form.get("privacy") !== "on") return { error: "Pra continuar, confirme que leu a política de privacidade.", values };

  const instagram = values.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");

  const ev = await getEventBySlug(slug);
  if (!ev) return { error: "Evento não encontrado.", values };

  const { data, error } = await db().rpc("create_registration", {
    p_slug: slug,
    p_name: values.name.slice(0, 120),
    p_email: values.email.toLowerCase().slice(0, 160),
    p_phone: phone,
    p_instagram: instagram ? `@${instagram}`.slice(0, 60) : "",
    p_dietary: values.dietary.slice(0, 300),
    p_image_consent: values.image_consent === "sim",
    p_marketing_consent: values.marketing === "on",
    p_seller_code: sellerCode || null,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("SOLD_OUT")) return { error: "As vagas esgotaram. Fale com a organização pra entrar na lista de espera.", values };
    if (msg.includes("REGISTRATIONS_CLOSED")) return { error: "As inscrições estão fechadas no momento.", values };
    console.error("[inscricao]", error);
    return { error: "Não conseguimos registrar agora. Tente de novo em alguns instantes.", values };
  }

  const reg = data as Registration;
  const isNew = Date.now() - new Date(reg.created_at).getTime() < 15_000;

  if (!isNew) {
    // Já existe inscrição ativa com este email. Não mostramos o ingresso aqui:
    // reenviamos o link para o próprio email, pra ninguém ver a inscrição de outra pessoa.
    await sendExistingEmail(reg, ev);
    return { info: `Já existe uma inscrição com o email ${reg.email}. Reenviamos o link pra esse email.` };
  }

  await sendPendingEmail(reg, ev);
  redirect(`/i/${reg.ticket_token}?nova=1`);
}
