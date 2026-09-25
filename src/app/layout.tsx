import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

// Archivo sostituisce Neue Haas Grotesk Display Pro finché non c'è il font licenziato:
// per cambiarlo basta sostituire questa importazione.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Cerca Bandi",
  description: "Studio Fauda — individuazione e valutazione di bandi e finanziamenti",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={archivo.variable}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-5 md:px-[22px]">{children}</main>
        </div>
      </body>
    </html>
  );
}
