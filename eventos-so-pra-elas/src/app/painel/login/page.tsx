import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entrar no painel", robots: { index: false } };

async function signIn(form: FormData) {
  "use server";
  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
  });
  if (error) redirect("/painel/login?erro=senha");
  redirect("/painel");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="page" style={{ maxWidth: 420 }}>
      <span className="eyebrow">Equipe Só Pra Elas</span>
      <h1>Entrar no painel</h1>
      {erro === "senha" && <div className="alert error" role="alert">Email ou senha incorretos.</div>}
      {erro === "acesso" && <div className="alert error" role="alert">Seu login não está cadastrado na equipe. Fale com a Jaqueline.</div>}
      <form action={signIn} className="stack">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="password">Senha</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn block" type="submit">Entrar</button>
      </form>
    </main>
  );
}
