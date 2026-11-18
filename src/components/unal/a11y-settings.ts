// Preferencias del panel de accesibilidad. Se guardan en localStorage y se aplican
// sobre <html> (tamaño de letra y filtros de contraste).

export const A11Y_STORAGE_KEY = "unal-accesibilidad";

export type A11ySettings = {
  font: number; // porcentaje, de 100 a 200
  contrast: 0 | 1 | 2 | 3;
  invert: boolean;
};

export const DEFAULT_A11Y: A11ySettings = { font: 100, contrast: 0, invert: false };

export const CONTRAST_FILTERS: Record<A11ySettings["contrast"], string> = {
  0: "",
  1: "contrast(1.35)",
  2: "grayscale(1)",
  3: "grayscale(1) contrast(1.6)",
};

export const INVERT_FILTER = "invert(1) hue-rotate(180deg)";

// Script que se ejecuta antes del primer pintado para evitar el parpadeo.
// Debe mantenerse sincronizado con `applyA11y`.
export const A11Y_BOOT_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(
  A11Y_STORAGE_KEY,
)})||"null");if(!s)return;var h=document.documentElement;if(s.font&&s.font!==100)h.style.fontSize=s.font+"%";var c=${JSON.stringify(
  CONTRAST_FILTERS,
)};var f=[c[s.contrast]||""];if(s.invert)f.push(${JSON.stringify(
  INVERT_FILTER,
)});var v=f.join(" ").trim();if(v){h.style.setProperty("--a11y-filter",v);h.setAttribute("data-a11y-filter","")}}catch(e){}})();`;
