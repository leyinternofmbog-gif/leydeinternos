import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { site } from "../../../config/site";
import { AccessibilityPanel } from "./accessibility-panel";

// Cabezote de la plantilla web institucional UNAL (área 1).
// `children` recibe el menú principal del sitio.
export function UnalHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="unal-header" id="unalTop">
      <div className="unal-firstmenu">
        <a href="https://smartkey.xertica.com/cloudkey/a/unal.edu.co/user/login" target="_blank" rel="noopener noreferrer">
          Correo institucional
        </a>
        <span aria-label="Idioma: español">ES</span>
        <ul className="unal-social">
          <li>
            <a className="x" href="https://x.com/UNALOficial" target="_blank" rel="noopener noreferrer" aria-label="Cuenta oficial en X" />
          </li>
          <li>
            <a
              className="facebook"
              href="https://www.facebook.com/UNALOficial"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Página oficial en Facebook"
            />
          </li>
          <li>
            <a className="email" href={`mailto:${site.contact.email}`} aria-label={`Escribir a ${site.contact.email}`} />
          </li>
        </ul>
      </div>

      
<div className="unal-logo">
  <a
    href={site.institutionUrl}
    aria-label="Ir al portal de la Universidad Nacional de Colombia"
  >
    <Image
      src="/brand/Code_Generated_Image.png"
      alt="Escudo de la Universidad Nacional de Colombia"
      width={190}
      height={100}
      unoptimized
    />
  </a>
</div>


      <div className="unal-seal">
        <Image
          src="/brand/sello-colombia.png"
          alt="Escudo de la República de Colombia"
          width={66}
          height={66}
          unoptimized
        />
      </div>

      <div className="unal-navigation">
        <div className="unal-site-url">
          <Link href="/">{site.siteUrl}</Link>
        </div>
        {children}
      </div>

      <AccessibilityPanel />
    </header>
  );
}
