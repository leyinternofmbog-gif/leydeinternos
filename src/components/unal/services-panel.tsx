"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SERVICES = [
  {
    label: "Correo institucional",
    href: "https://smartkey.xertica.com/cloudkey/a/unal.edu.co/user/login",
    icon: "/brand/servicio-correo.png",
  },
  { label: "Sistema de Información Académica", href: "https://sia.unal.edu.co/", icon: "/brand/servicio-sia.png" },
  { label: "Bibliotecas", href: "https://bibliotecas.unal.edu.co/", icon: "/brand/servicio-bibliotecas.png" },
  { label: "Convocatorias", href: "https://personal.unal.edu.co/", icon: "/brand/servicio-convocatorias.png" },
];

// Pestaña desplegable de servicios (área 3 de la plantilla institucional).
export function ServicesPanel() {
  const [open, setOpen] = useState(false);
  return (
    <aside className="unal-services no-print" data-open={open} aria-label="Servicios institucionales">
      <button
        type="button"
        className="unal-services-tab"
        aria-expanded={open}
        aria-controls="servicios-unal"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronRight aria-hidden className="size-4" /> : <ChevronLeft aria-hidden className="size-4" />}
        <span>Servicios</span>
      </button>
      <ul id="servicios-unal" inert={!open}>
        {SERVICES.map((service) => (
          <li key={service.href}>
            <a href={service.href} target="_blank" rel="noopener noreferrer">
              <Image src={service.icon} alt="" width={32} height={32} unoptimized />
              {service.label}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
