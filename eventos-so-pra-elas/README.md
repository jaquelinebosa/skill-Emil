# Eventos Só Pra Elas

Inscrições com PIX manual, confirmação pela equipe e check-in por QR code.

- `/{slug}`: formulário público (ex.: `/bh-2026`)
- `/i/{token}`: página da participante (dados do PIX enquanto pendente; ingresso com QR depois de pago)
- `/painel`: lista, busca, confirmação de pagamento, WhatsApp e exportação
- `/painel/checkin`: leitor de QR pela câmera do celular + busca por nome/telefone
- `/painel/evento`: PIX, WhatsApp, horário, endereço, cardápio, vagas, termo de imagem, abrir/fechar inscrições
- `/privacidade`: política de privacidade (LGPD)

## Stack
Next.js 15 (App Router) · Supabase (Postgres + Auth) · Resend (emails) · Vercel (hospedagem e rotina diária)

O banco nega qualquer acesso pela chave pública (RLS sem policies). Todo dado passa pelo servidor com a chave secreta.
As regras de vaga, pagamento e check-in ficam em funções SQL (`supabase/migrations/0001_schema_inicial.sql`),
com trava de concorrência: duas pessoas não pegam a última vaga ao mesmo tempo, e um QR não entra duas vezes.

## Rodar localmente
```
cp .env.example .env.local   # preencher SUPABASE_SECRET_KEY e RESEND_API_KEY
npm install
npm run dev
```

## Criar acessos da equipe
```
npm run criar-usuario -- jaqueline@jaquelinebosa.com.br "senha-forte-aqui" "Jaqueline" admin
npm run criar-usuario -- fernanda@exemplo.com "outra-senha-forte" "Fernanda" sales
npm run criar-usuario -- equipe@exemplo.com "mais-uma-senha" "Recepção" checkin
```
Papéis: `admin` faz tudo · `sales` confirma pagamentos e reenvia emails · `checkin` só lê QR.

## Publicar
1. Vercel: importar o projeto e preencher as variáveis do `.env.example`.
2. Registro.br (DNS de jaquelinebosa.com.br): CNAME `eventos` → valor indicado pela Vercel.
3. Resend: adicionar o domínio e criar no Registro.br os registros TXT/MX que o Resend indicar (SPF e DKIM).
4. Supabase > Authentication > Sign In / Providers: desligar "Allow new users to sign up" (os acessos são criados pelo script).
