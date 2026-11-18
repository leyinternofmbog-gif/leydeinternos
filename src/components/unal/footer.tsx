import Image from "next/image";
import { site } from "../../../config/site";

const COLUMN_A = [
  { label: "Régimen Legal", href: "https://legal.unal.edu.co" },
  { label: "Talento humano", href: "https://personal.unal.edu.co/" },
  { label: "Contratación", href: "https://www.unal.edu.co/contratacion/" },
  { label: "Ofertas de empleo", href: "https://personal.unal.edu.co/" },
  { label: "Rendición de cuentas", href: "https://launalcuenta.unal.edu.co/" },
  { label: "Concurso docente", href: "https://docentes.unal.edu.co/concurso-profesoral/" },
  { label: "Pago Virtual", href: "https://www.pagovirtual.unal.edu.co/" },
  { label: "Control interno", href: "https://controlinterno.unal.edu.co/" },
  { label: "Calidad", href: "https://siga.unal.edu.co/" },
  { label: "Buzón de notificaciones", href: "https://unal.edu.co/buzon-de-notificaciones/" },
];

const COLUMN_B = [
  { label: "Correo institucional", href: "https://smartkey.xertica.com/cloudkey/a/unal.edu.co/user/login" },
  { label: "Mapa del sitio", href: "https://unal.edu.co/mapa-del-sitio/" },
  { label: "Redes Sociales", href: "https://redessociales.unal.edu.co" },
  { label: "FAQ", href: "https://unal.edu.co/preguntas-frecuentes/" },
  { label: "Quejas y reclamos", href: "https://quejasyreclamos.unal.edu.co/" },
  { label: "Atención en línea", href: "https://unal.edu.co/atencion-en-linea/" },
  { label: "Encuesta", href: "https://unal.edu.co/encuesta/" },
  { label: "Contáctenos", href: "https://unal.edu.co/contactenos/" },
  { label: "Estadísticas", href: "https://estadisticas.unal.edu.co/" },
  { label: "Glosario", href: "https://unal.edu.co/glosario/" },
];

function LinkColumn({ links }: { links: { label: string; href: string }[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-1">
      {links.map((link) => (
        <li key={link.label}>
          <a href={link.href} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

// Pie de página de la plantilla web institucional UNAL (área 5).
export function UnalFooter() {
  return (
    <footer className="unal-footer">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-6 py-6 md:grid-cols-[1fr_1fr_2fr_auto] md:gap-0">
        <div className="md:pr-6">
          <LinkColumn links={COLUMN_A} />
        </div>
        <div className="md:pr-6">
          <LinkColumn links={COLUMN_B} />
        </div>
        <div className="grid gap-6 border-[#4b4b4b] sm:grid-cols-2 md:border-x md:px-6">
          <div className="leading-5">
            <p className="font-bold text-white">{site.contact.title}:</p>
            {site.contact.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-2">Línea Gratuita Nacional: 01 8000 912 597</p>
          </div>
          <div className="leading-5 sm:text-right">
            <p>© Copyright {site.copyrightYear}</p>
            <p>Algunos derechos reservados.</p>
            <p>
              <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
            </p>
            <p className="mt-2">{site.dependency}</p>
            <p>Universidad Nacional de Colombia</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 md:w-44 md:pl-6">
          <a href="https://orgullo.unal.edu.co" target="_blank" rel="noopener noreferrer">
            <Image src="/brand/logo-orgullo-un.png" alt="Orgullo UN" width={78} height={21} unoptimized />
          </a>
          <a href="https://agenciadenoticias.unal.edu.co" target="_blank" rel="noopener noreferrer">
            <Image src="/brand/logo-agencia-noticias.png" alt="Agencia de Noticias UN" width={94} height={25} unoptimized />
          </a>
          <a href="https://www.gov.co/" target="_blank" rel="noopener noreferrer">
            <Image src="/brand/logo-gobierno-en-linea.png" alt="Portal del Estado colombiano GOV.CO" width={67} height={51} unoptimized />
          </a>
          <a href="https://www.contaduria.gov.co/" target="_blank" rel="noopener noreferrer">
            <Image src="/brand/logo-contaduria.png" alt="Contaduría General de la Nación" width={67} height={51} unoptimized />
          </a>
        </div>
      </div>
    </footer>
  );
}
