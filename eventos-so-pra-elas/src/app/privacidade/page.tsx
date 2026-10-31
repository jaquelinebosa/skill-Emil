import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <main className="page">
      <span className="eyebrow">Movimento Só Pra Elas</span>
      <h1>Política de privacidade das inscrições</h1>
      <div className="stack">
        <h2>Quais dados coletamos</h2>
        <p>Nome, email, WhatsApp, perfil do Instagram (opcional), restrição alimentar (opcional) e sua escolha sobre o uso de imagem.</p>
        <h2>Para que usamos</h2>
        <p>Para registrar sua inscrição, enviar os dados de pagamento e o ingresso, confirmar sua entrada no dia e informar ao local do evento o número de participantes e as restrições alimentares. Esse uso é necessário para cumprir a inscrição que você fez (LGPD, art. 7º, V).</p>
        <p>O Instagram serve para marcar você nas publicações do evento, se você tiver autorizado o uso de imagem.</p>
        <h2>Uso de imagem</h2>
        <p>Fotos e vídeos com a sua imagem só são publicados se você autorizar no formulário. Você pode revogar a autorização a qualquer momento pelo email de contato do evento, e a revogação vale para novos usos. Quem não autoriza recebe uma identificação no credenciamento para a equipe de fotografia.</p>
        <h2>Novidades de próximos eventos</h2>
        <p>Só enviamos se você marcar essa opção. Dá pra cancelar a qualquer momento respondendo um dos emails.</p>
        <h2>Com quem compartilhamos</h2>
        <p>Com a equipe de organização do evento e com os serviços que fazem o sistema funcionar: banco de dados (Supabase), hospedagem (Vercel) e envio de emails (Resend). Não vendemos nem cedemos seus dados.</p>
        <h2>Por quanto tempo guardamos</h2>
        <p>Pelo tempo necessário para organizar o evento e cumprir obrigações legais. Os registros de autorização de imagem ficam guardados enquanto as imagens estiverem publicadas.</p>
        <h2>Seus direitos</h2>
        <p>Você pode pedir acesso, correção ou exclusão dos seus dados, e revogar consentimentos, pelo email {contact ? <a href={`mailto:${contact}`}>{contact}</a> : "de contato do evento"}.</p>
      </div>
    </main>
  );
}
