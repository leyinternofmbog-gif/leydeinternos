import "./globals.css"
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { A11Y_BOOT_SCRIPT } from "@/components/unal/a11y-settings";
import { DashboardNav } from "@/components/unal/dashboard-nav";
import { UnalFooter } from "@/components/unal/footer";
import { UnalHeader } from "@/components/unal/header";
import { ResponsiveNav } from "@/components/unal/responsive-nav";
import { ServicesPanel } from "@/components/unal/services-panel";



// Familia tipográfica institucional Ancízar Sans.
const ancizarSans = localFont({
  src: [
    { path: "../../fonts/ancizar-sans-light.woff2", weight: "300", style: "normal" },
    { path: "../../fonts/ancizar-sans-regular.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/ancizar-sans-regular-italic.woff2", weight: "400", style: "italic" },
    { path: "../../fonts/ancizar-sans-bold.woff2", weight: "700", style: "normal" },
    { path: "../../fonts/ancizar-sans-bold-italic.woff2", weight: "700", style: "italic" },
    { path: "../../fonts/ancizar-sans-extrabold.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-ancizar-sans",
  display: "swap",
  fallback: ["Tahoma", "Geneva", "sans-serif"],
});

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es" className={ancizarSans.variable}>
      <body className="flex min-h-dvh flex-col bg-[#f3f5f2] font-sans text-gray-900 antialiased">

        {/* Configuración de accesibilidad */}
        <script
          dangerouslySetInnerHTML={{
            __html: A11Y_BOOT_SCRIPT,
          }}
        />

        {/* Enlace de accesibilidad */}
        <a
          href="#contenido"
          className="sr-only z-[100] bg-white px-4 py-2 font-bold text-gray-900 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Saltar al contenido principal
        </a>

        {/* Encabezado institucional UNAL */}
        <UnalHeader>
          <ResponsiveNav>
            <DashboardNav />
          </ResponsiveNav>
        </UnalHeader>

        {/* Contenido principal */}
        <main id="contenido" className="flex-1">
          {children}
        </main>

        {/* Pie de página institucional */}
        <UnalFooter />

        {/* Panel de servicios */}
        <ServicesPanel />

      </body>
    </html>
  );
}
