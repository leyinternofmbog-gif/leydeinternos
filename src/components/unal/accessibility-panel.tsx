"use client";

import { useState } from "react";
import {
  A11Y_STORAGE_KEY,
  CONTRAST_FILTERS,
  DEFAULT_A11Y,
  INVERT_FILTER,
  type A11ySettings,
} from "./a11y-settings";

function readSettings(): A11ySettings {
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    return raw ? { ...DEFAULT_A11Y, ...JSON.parse(raw) } : DEFAULT_A11Y;
  } catch {
    return DEFAULT_A11Y;
  }
}

function applySettings(settings: A11ySettings) {
  const html = document.documentElement;
  html.style.fontSize = settings.font === 100 ? "" : `${settings.font}%`;
  const filter = [CONTRAST_FILTERS[settings.contrast], settings.invert ? INVERT_FILTER : ""]
    .join(" ")
    .trim();
  if (filter) {
    html.style.setProperty("--a11y-filter", filter);
    html.setAttribute("data-a11y-filter", "");
  } else {
    html.style.removeProperty("--a11y-filter");
    html.removeAttribute("data-a11y-filter");
  }
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Almacenamiento no disponible (modo privado): el ajuste dura solo esta visita.
  }
}

const CONTRAST_LABELS = ["", "Alto contraste", "Escala de grises", "Grises con alto contraste"];

// Pestaña y panel de accesibilidad (área 2 de la plantilla institucional).
export function AccessibilityPanel() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(DEFAULT_A11Y);

  const update = (next: A11ySettings) => {
    setSettings(next);
    applySettings(next);
  };

  return (
    <>
      {open && (
        <div id="panel-accesibilidad" className="unal-a11y-panel no-print">
          <div className="mx-auto grid max-w-[1240px] gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h2>Tamaño de letra</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="unal-a11y-button"
                  onClick={() => update({ ...settings, font: Math.max(100, settings.font - 10) })}
                  aria-label="Disminuir tamaño de letra"
                >
                  A<sup>-</sup>
                </button>
                <button
                  type="button"
                  className="unal-a11y-button"
                  onClick={() => update({ ...settings, font: Math.min(200, settings.font + 10) })}
                  aria-label="Aumentar tamaño de letra"
                >
                  A<sup>+</sup>
                </button>
                <output className="min-w-14 rounded-sm bg-white px-2 py-1.5 text-center font-bold text-ink" aria-live="polite">
                  {settings.font}%
                </output>
              </div>
            </div>
            <div>
              <h2>Cambiar contrastes</h2>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className="unal-a11y-button"
                    aria-pressed={settings.contrast === level}
                    title={CONTRAST_LABELS[level]}
                    aria-label={CONTRAST_LABELS[level]}
                    onClick={() => update({ ...settings, contrast: settings.contrast === level ? 0 : level })}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2>Invertir colores</h2>
              <button
                type="button"
                className="unal-a11y-button"
                aria-pressed={settings.invert}
                onClick={() => update({ ...settings, invert: !settings.invert })}
              >
                Aplicar
              </button>
            </div>
            <div>
              <h2>Restablecer ajustes</h2>
              <button type="button" className="unal-a11y-button" onClick={() => update(DEFAULT_A11Y)}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        className="unal-a11y-tab no-print"
        aria-expanded={open}
        aria-controls="panel-accesibilidad"
        onClick={() => {
          if (!open) setSettings(readSettings());
          setOpen(!open);
        }}
      >
        Panel de Accesibilidad
      </button>
    </>
  );
}
