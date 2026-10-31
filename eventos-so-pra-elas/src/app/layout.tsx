import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "Eventos Só Pra Elas", template: "%s · Só Pra Elas" },
  description: "Inscrições para os eventos do Movimento Só Pra Elas.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#8E2A5C" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
