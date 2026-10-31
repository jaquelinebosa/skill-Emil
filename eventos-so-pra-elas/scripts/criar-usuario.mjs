// Cria um acesso ao painel.
// Uso: npm run criar-usuario -- email@exemplo.com "Senha-Forte-123" "Fernanda" sales
// Papéis: admin (tudo), sales (confirma pagamentos), checkin (só lê QR na entrada)
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env.local"); } catch { /* usa variáveis do ambiente */ }

const [email, password, name, role = "sales"] = process.argv.slice(2);
if (!email || !password || !name || !["admin", "sales", "checkin"].includes(role)) {
  console.error('Uso: npm run criar-usuario -- email "senha" "Nome" admin|sales|checkin');
  process.exit(1);
}
if (password.length < 10) {
  console.error("Use uma senha com pelo menos 10 caracteres.");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  console.error("Erro ao criar login:", error.message);
  process.exit(1);
}
const { error: e2 } = await supabase.from("staff").insert({ user_id: data.user.id, name, role });
if (e2) {
  console.error("Login criado, mas falhou ao cadastrar na equipe:", e2.message);
  process.exit(1);
}
console.log(`Pronto: ${name} (${role}) entra em /painel com ${email}`);
