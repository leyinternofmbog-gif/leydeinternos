"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

// En pantallas pequeñas el menú principal se colapsa detrás de un botón.
export function ResponsiveNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="unal-menu-toggle"
        aria-expanded={open}
        aria-controls="menu-principal"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen(!open)}
      >
        {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
      </button>
      <div
        id="menu-principal"
        className="unal-menu"
        data-open={open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        {children}
      </div>
    </>
  );
}
