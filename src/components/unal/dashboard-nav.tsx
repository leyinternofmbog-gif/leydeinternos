"use client";

import { LogOut } from "lucide-react";
import { NavLinks } from "./nav-links";

export function DashboardNav() {
  function cerrarSesion() {
    localStorage.removeItem("unal_token");
    window.location.href = "/login-otp";
  }

  return (
    <>
      <NavLinks
        items={[{ label: "Auditoría de internos", href: "/dashboard-internos", exact: true }]}
      />
      <div className="flex items-center pb-2 md:pb-1">
        <button
          type="button"
          onClick={cerrarSesion}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-white/30 px-2.5 text-xs font-bold text-white hover:bg-white/10"
        >
          <LogOut aria-hidden className="size-3.5" />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}
