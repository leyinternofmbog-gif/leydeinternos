"use client";

import { useEffect, useMemo, useState } from "react";
import { IBM_Plex_Sans } from "next/font/google";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  History,
  Filter,
  RotateCcw,
  RefreshCw,
  LogOut,
  Building2,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Download,
  ArrowUpDown,
} from "lucide-react";

import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

const fuente = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// ==========================================
// TIPOS DE DATOS
// ==========================================

type Planilla = {
  record_id?: string;
  periodo: string;
  fecha_pago: string;
  numero_planilla: string;
  valor_planilla: number;
  valor_esperado: number | null;
  valor_diferente: boolean;
  sin_giro: boolean;
  pdf_nombre: string;
  nombre_pdf_esperado: string;
  renuncio: boolean;
  alertas: string[];
};

type Estudiante = {
  documento: string;
  nombre: string;
  ips: string;
  inicio_practica: string;
  fin_practica: string;
  meses_faltantes: string[];
  meses_exentos: string[];
  total_reportes: number;
  historico: Planilla[];
};

type RespuestaAuditoria = {
  estudiantes?: Estudiante[];
  avisos?: string[];
  error?: string;
};

type Estado = "al-dia" | "pendiente" | "alertas";
type Orden = "nombre" | "pendientes" | "alertas" | "reportes";

type Filtros = {
  busqueda: string;
  ips: string;
  estado: string;
  anio: string;
  mes: string;
  alerta: string;
};

const FILTROS_INICIALES: Filtros = {
  busqueda: "",
  ips: "todas",
  estado: "todos",
  anio: "todos",
  mes: "todos",
  alerta: "todas",
};

const OPCIONES_PAGINA = [10, 15, 25, 50];

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

// ==========================================
// ESTILOS REUTILIZABLES
// ==========================================

const foco =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#466b3f]/40 focus-visible:ring-offset-1";

const campo =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 transition placeholder:text-gray-400 hover:border-gray-400 focus:border-[#466b3f] focus:ring-2 focus:ring-[#466b3f]/20 outline-none";

const boton = `inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 ${foco}`;

const ESTADOS: Record<
  Estado,
  {
    etiqueta: string;
    punto: string;
    pill: string;
    barra: string;
    franja: string;
  }
> = {
  "al-dia": {
    etiqueta: "Al día",
    punto: "bg-emerald-600",
    pill: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    barra: "bg-emerald-600",
    franja: "border-l-emerald-600",
  },
  pendiente: {
    etiqueta: "Pendiente",
    punto: "bg-amber-500",
    pill: "bg-amber-50 text-amber-800 ring-amber-200",
    barra: "bg-amber-500",
    franja: "border-l-amber-500",
  },
  alertas: {
    etiqueta: "Con alertas",
    punto: "bg-red-600",
    pill: "bg-red-50 text-red-800 ring-red-200",
    barra: "bg-red-600",
    franja: "border-l-red-600",
  },
};

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function obtenerAlertas(e: Estudiante) {
  return e.historico.flatMap((p) => p.alertas || []);
}

function obtenerEstado(e: Estudiante): Estado {
  if (e.meses_faltantes.length > 0) return "pendiente";
  if (obtenerAlertas(e).length > 0) return "alertas";
  return "al-dia";
}

function normalizar(texto: unknown) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function iniciales(nombre: string) {
  const partes = (nombre || "?").trim().split(/\s+/);
  return ((partes[0]?.[0] || "?") + (partes[1]?.[0] || "")).toUpperCase();
}

function etiquetaPeriodo(periodo: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(periodo || "");
  if (!m) return periodo || "—";
  return `${MESES[Number(m[2]) - 1]?.slice(0, 3) ?? m[2]} ${m[1]}`;
}

function coincidePeriodo(periodos: string[], anio: string, mes: string) {
  if (anio !== "todos" && mes !== "todos")
    return periodos.some((p) => p === `${anio}-${mes}`);
  if (anio !== "todos") return periodos.some((p) => p?.startsWith(`${anio}-`));
  if (mes !== "todos") return periodos.some((p) => p?.slice(5, 7) === mes);
  return true;
}

function coincideFiltros(e: Estudiante, f: Filtros, ignorarEstado = false) {
  const q = normalizar(f.busqueda);
  if (
    q &&
    !normalizar(e.nombre).includes(q) &&
    !normalizar(e.documento).includes(q)
  )
    return false;

  if (f.ips !== "todas" && e.ips !== f.ips) return false;
  if (!ignorarEstado && f.estado !== "todos" && obtenerEstado(e) !== f.estado)
    return false;
  if (f.alerta !== "todas" && !obtenerAlertas(e).includes(f.alerta))
    return false;

  const periodos = [...e.historico.map((h) => h.periodo), ...e.meses_faltantes];
  return coincidePeriodo(periodos, f.anio, f.mes);
}

function rangoPaginas(actual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const base = [...new Set([1, total, actual - 1, actual, actual + 1])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const salida: (number | "…")[] = [];
  base.forEach((n, i) => {
    if (i > 0 && n - base[i - 1] > 1) salida.push("…");
    salida.push(n);
  });
  return salida;
}

function exportarCSV(estudiantes: Estudiante[]) {
  const columnas = [
    "Documento",
    "Nombre",
    "IPS",
    "Inicio práctica",
    "Fin práctica",
    "Reportes",
    "Estado",
    "Meses faltantes",
    "Alertas",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const filas = estudiantes.map((e) =>
    [
      e.documento,
      e.nombre,
      e.ips,
      e.inicio_practica,
      e.fin_practica,
      e.total_reportes,
      ESTADOS[obtenerEstado(e)].etiqueta,
      e.meses_faltantes.join(" | "),
      [...new Set(obtenerAlertas(e))].join(" | "),
    ]
      .map(esc)
      .join(";")
  );

  const contenido = "\uFEFF" + [columnas.map(esc).join(";"), ...filas].join("\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `auditoria_internos_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==========================================
// SUBCOMPONENTES
// ==========================================

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function EstadoPill({ estado }: { estado: Estado }) {
  const e = ESTADOS[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${e.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${e.punto}`} />
      {e.etiqueta}
    </span>
  );
}

function Estadistica({
  titulo,
  valor,
  cargando,
}: {
  titulo: string;
  valor: number;
  cargando: boolean;
}) {
  return (
    <div className="px-5 py-4 first:pl-0 last:pr-0">
      <p className="text-xs text-gray-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
        {cargando ? (
          <span className="inline-block h-7 w-12 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        ) : (
          valor.toLocaleString("es-CO")
        )}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="animate-pulse motion-reduce:animate-none">
          <td className="border-l-4 border-l-transparent px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-100" />
              <div className="space-y-2">
                <div className="h-3 w-40 rounded bg-gray-100" />
                <div className="h-2.5 w-24 rounded bg-gray-100" />
              </div>
            </div>
          </td>
          <td className="hidden px-4 py-4 md:table-cell">
            <div className="h-3 w-32 rounded bg-gray-100" />
          </td>
          <td className="hidden px-4 py-4 lg:table-cell">
            <div className="h-3 w-8 rounded bg-gray-100" />
          </td>
          <td className="px-4 py-4">
            <div className="h-5 w-20 rounded-full bg-gray-100" />
          </td>
          <td className="hidden px-4 py-4 lg:table-cell">
            <div className="h-3 w-24 rounded bg-gray-100" />
          </td>
          <td className="hidden px-4 py-4 xl:table-cell">
            <div className="h-3 w-28 rounded bg-gray-100" />
          </td>
          <td className="px-5 py-4">
            <div className="ml-auto h-8 w-24 rounded bg-gray-100" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function DashboardInternosPage() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [filtrosAvanzados, setFiltrosAvanzados] = useState(false);
  const [orden, setOrden] = useState<Orden>("nombre");

  const [pagina, setPagina] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(15);

  const [seleccionado, setSeleccionado] = useState<Estudiante | null>(null);
  const [soloAlertasHistorial, setSoloAlertasHistorial] = useState(false);

  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(
    null
  );

  function actualizarFiltro<K extends keyof Filtros>(k: K, v: Filtros[K]) {
    setFiltros((prev) => ({ ...prev, [k]: v }));
    setPagina(1);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES);
    setPagina(1);
  }

  function abrirHistorial(est: Estudiante) {
    setSoloAlertasHistorial(false);
    setSeleccionado(est);
  }

  // ==========================================
  // CONSULTAR BACKEND
  // ==========================================

  async function cargarDatos() {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("unal_token") || "";

      if (!token) {
        throw new Error(
          "No se encontró una sesión activa. Inicia sesión nuevamente."
        );
      }

      const respuesta = await fetch("/.netlify/functions/audit_dashboard", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const data: RespuestaAuditoria = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.error || "No fue posible consultar REDCap.");
      }

      setEstudiantes(Array.isArray(data.estudiantes) ? data.estudiantes : []);
      setAvisos(Array.isArray(data.avisos) ? data.avisos : []);
      setUltimaActualizacion(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al consultar los datos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  // ==========================================
  // OPCIONES DE FILTROS
  // ==========================================

  const opcionesIPS = useMemo(
    () =>
      [...new Set(estudiantes.map((e) => e.ips).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "es")
      ),
    [estudiantes]
  );

  const opcionesAnios = useMemo(() => {
    const anios = new Set<string>();
    estudiantes.forEach((e) => {
      [...e.historico.map((h) => h.periodo), ...e.meses_faltantes].forEach(
        (p) => {
          if (/^\d{4}-\d{2}$/.test(p)) anios.add(p.slice(0, 4));
        }
      );
    });
    return [...anios].sort().reverse();
  }, [estudiantes]);

  const opcionesAlertas = useMemo(
    () =>
      [...new Set(estudiantes.flatMap(obtenerAlertas))].sort((a, b) =>
        a.localeCompare(b, "es")
      ),
    [estudiantes]
  );

  // ==========================================
  // FILTRADO Y ORDEN
  // ==========================================

  // Conteos por estado (respetan todos los filtros menos el de estado)
  const conteosEstado = useMemo(() => {
    const base = estudiantes.filter((e) => coincideFiltros(e, filtros, true));
    return {
      todos: base.length,
      "al-dia": base.filter((e) => obtenerEstado(e) === "al-dia").length,
      pendiente: base.filter((e) => obtenerEstado(e) === "pendiente").length,
      alertas: base.filter((e) => obtenerEstado(e) === "alertas").length,
    };
  }, [estudiantes, filtros]);

  const filtrados = useMemo(() => {
    const lista = estudiantes.filter((e) => coincideFiltros(e, filtros));

    return [...lista].sort((a, b) => {
      switch (orden) {
        case "pendientes":
          return b.meses_faltantes.length - a.meses_faltantes.length;
        case "alertas":
          return obtenerAlertas(b).length - obtenerAlertas(a).length;
        case "reportes":
          return b.total_reportes - a.total_reportes;
        default:
          return (a.nombre || "").localeCompare(b.nombre || "", "es");
      }
    });
  }, [estudiantes, filtros, orden]);

  const indicadores = useMemo(
    () => ({
      reportes: filtrados.reduce((t, e) => t + e.total_reportes, 0),
      pendientes: filtrados.reduce((t, e) => t + e.meses_faltantes.length, 0),
      alertas: filtrados.reduce((t, e) => t + obtenerAlertas(e).length, 0),
    }),
    [filtrados]
  );

  // ==========================================
  // PAGINACIÓN
  // ==========================================

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / itemsPorPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * itemsPorPagina;
  const estudiantesPagina = filtrados.slice(desde, desde + itemsPorPagina);

  // ==========================================
  // FILTROS ACTIVOS (chips)
  // ==========================================

  const chipsActivos: { clave: keyof Filtros; texto: string }[] = [];
  if (filtros.busqueda)
    chipsActivos.push({ clave: "busqueda", texto: `“${filtros.busqueda}”` });
  if (filtros.ips !== "todas")
    chipsActivos.push({ clave: "ips", texto: filtros.ips });
  if (filtros.estado !== "todos")
    chipsActivos.push({
      clave: "estado",
      texto: ESTADOS[filtros.estado as Estado].etiqueta,
    });
  if (filtros.anio !== "todos")
    chipsActivos.push({ clave: "anio", texto: `Año ${filtros.anio}` });
  if (filtros.mes !== "todos")
    chipsActivos.push({ clave: "mes", texto: MESES[Number(filtros.mes) - 1] });
  if (filtros.alerta !== "todas")
    chipsActivos.push({ clave: "alerta", texto: filtros.alerta });

  const hayFiltros = chipsActivos.length > 0;

  // ==========================================
  // RESUMEN POR ESTADO
  // ==========================================

  const total = conteosEstado.todos;
  const segmentos: { clave: Estado; n: number }[] = [
    { clave: "al-dia", n: conteosEstado["al-dia"] },
    { clave: "pendiente", n: conteosEstado.pendiente },
    { clave: "alertas", n: conteosEstado.alertas },
  ];
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const pestanas: { v: string; t: string; n: number; clave?: Estado }[] = [
    { v: "todos", t: "Todos", n: total },
    { v: "al-dia", t: "Al día", n: conteosEstado["al-dia"], clave: "al-dia" },
    {
      v: "pendiente",
      t: "Con meses pendientes",
      n: conteosEstado.pendiente,
      clave: "pendiente",
    },
    { v: "alertas", t: "Con alertas", n: conteosEstado.alertas, clave: "alertas" },
  ];

  const historialVisible = seleccionado
    ? soloAlertasHistorial
      ? seleccionado.historico.filter((h) => h.alertas.length > 0)
      : seleccionado.historico
    : [];

  // ==========================================
  // RENDERIZADO
  // ==========================================

  return (
    <div className={`${fuente.className} min-h-screen bg-[#f3f5f2] text-gray-900 antialiased`}>
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-[#466b3f] text-white">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-lg font-bold">UNAL RIM</h1>
              <p className="truncate text-xs text-gray-500">
                Universidad Nacional de Colombia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cargarDatos}
              disabled={loading}
              className={boton}
              aria-label="Actualizar datos"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`}
                aria-hidden
              />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("unal_token");
                window.location.href = "/login-otp";
              }}
              className={`inline-flex h-10 items-center gap-2 rounded-lg bg-[#466b3f] px-3.5 text-sm font-medium text-white transition hover:bg-[#365331] ${foco}`}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        {/* TÍTULO */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-[28px]">
              Auditoría de internos
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              Aportes PILA por mes, planillas cargadas y soportes por revisar.
            </p>
          </div>
          <p className="text-xs text-gray-500" aria-live="polite">
            {ultimaActualizacion
              ? `Actualizado ${ultimaActualizacion.toLocaleString("es-CO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}`
              : "Sin consulta registrada"}
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">No se pudieron cargar los datos</p>
              <p className="mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={cargarDatos}
              className={`h-9 rounded-lg border border-red-300 bg-white px-3 text-sm font-medium text-red-800 hover:bg-red-100 ${foco}`}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* RESUMEN */}
        <section
          aria-label="Resumen de estado"
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex items-baseline gap-3">
                <p className="text-5xl font-bold tabular-nums leading-none">
                  {loading ? (
                    <span className="inline-block h-11 w-20 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
                  ) : (
                    total.toLocaleString("es-CO")
                  )}
                </p>
                <p className="text-sm text-gray-600">internos en la selección</p>
              </div>

              {/* Barra de composición */}
              <div
                className="mt-5 flex h-3 w-full overflow-hidden rounded-full bg-gray-100"
                role="img"
                aria-label={`Al día ${pct(segmentos[0].n)}%, pendientes ${pct(segmentos[1].n)}%, con alertas ${pct(segmentos[2].n)}%`}
              >
                {!loading &&
                  segmentos.map((s) =>
                    s.n > 0 ? (
                      <button
                        key={s.clave}
                        type="button"
                        onClick={() => actualizarFiltro("estado", s.clave)}
                        style={{ width: `${(s.n / total) * 100}%` }}
                        className={`${ESTADOS[s.clave].barra} h-full border-r-2 border-white last:border-r-0 transition hover:brightness-110 ${foco}`}
                        title={`${ESTADOS[s.clave].etiqueta}: ${s.n} (${pct(s.n)}%)`}
                        aria-label={`Filtrar: ${ESTADOS[s.clave].etiqueta}`}
                      />
                    ) : null
                  )}
              </div>

              {/* Pestañas de estado */}
              <div
                role="group"
                aria-label="Filtrar por estado"
                className="mt-4 flex flex-wrap gap-2"
              >
                {pestanas.map((p) => {
                  const activo = filtros.estado === p.v;
                  return (
                    <button
                      key={p.v}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => actualizarFiltro("estado", p.v)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${foco} ${
                        activo
                          ? "border-[#466b3f] bg-[#466b3f] text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      {p.clave && (
                        <span
                          className={`h-2 w-2 rounded-full ${ESTADOS[p.clave].punto} ${activo ? "ring-2 ring-white/60" : ""}`}
                        />
                      )}
                      {p.t}
                      <span
                        className={`rounded-md px-1.5 text-xs tabular-nums ${
                          activo ? "bg-white/20" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {loading ? "…" : p.n}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Estadísticas secundarias */}
            <div className="grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-200 pt-2 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <Estadistica
                titulo="Reportes recibidos"
                valor={indicadores.reportes}
                cargando={loading}
              />
              <Estadistica
                titulo="Meses pendientes"
                valor={indicadores.pendientes}
                cargando={loading}
              />
              <Estadistica
                titulo="Alertas detectadas"
                valor={indicadores.alertas}
                cargando={loading}
              />
            </div>
          </div>
        </section>

        {/* FILTROS */}
        <Card>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  type="search"
                  placeholder="Buscar por nombre o documento"
                  aria-label="Buscar por nombre o documento"
                  value={filtros.busqueda}
                  onChange={(e) => actualizarFiltro("busqueda", e.target.value)}
                  className={`${campo} pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden`}
                />
                {filtros.busqueda && (
                  <button
                    type="button"
                    aria-label="Borrar búsqueda"
                    onClick={() => actualizarFiltro("busqueda", "")}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 ${foco}`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>

              <div className="relative">
                <ArrowUpDown
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <select
                  value={orden}
                  onChange={(e) => {
                    setOrden(e.target.value as Orden);
                    setPagina(1);
                  }}
                  className={`${campo} w-auto pl-9`}
                  aria-label="Ordenar por"
                >
                  <option value="nombre">Nombre (A–Z)</option>
                  <option value="pendientes">Más meses pendientes</option>
                  <option value="alertas">Más alertas</option>
                  <option value="reportes">Más reportes</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setFiltrosAvanzados((v) => !v)}
                className={boton}
                aria-expanded={filtrosAvanzados}
              >
                <Filter className="h-4 w-4 text-[#466b3f]" aria-hidden />
                Más filtros
                <ChevronDown
                  className={`h-4 w-4 transition-transform motion-reduce:transition-none ${filtrosAvanzados ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>

              <button
                type="button"
                onClick={() => exportarCSV(filtrados)}
                disabled={filtrados.length === 0}
                className={boton}
              >
                <Download className="h-4 w-4" aria-hidden />
                Exportar CSV
              </button>
            </div>

            {filtrosAvanzados && (
              <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 md:grid-cols-2 xl:grid-cols-4">
                <Campo label="Institución / IPS">
                  <select
                    value={filtros.ips}
                    onChange={(e) => actualizarFiltro("ips", e.target.value)}
                    className={campo}
                  >
                    <option value="todas">Todas las IPS</option>
                    {opcionesIPS.map((ips) => (
                      <option key={ips} value={ips}>
                        {ips}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Año">
                  <select
                    value={filtros.anio}
                    onChange={(e) => actualizarFiltro("anio", e.target.value)}
                    className={campo}
                  >
                    <option value="todos">Todos los años</option>
                    {opcionesAnios.map((anio) => (
                      <option key={anio} value={anio}>
                        {anio}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Mes">
                  <select
                    value={filtros.mes}
                    onChange={(e) => actualizarFiltro("mes", e.target.value)}
                    className={campo}
                  >
                    <option value="todos">Todos los meses</option>
                    {MESES.map((mes, i) => (
                      <option key={mes} value={String(i + 1).padStart(2, "0")}>
                        {mes}
                      </option>
                    ))}
                  </select>
                </Campo>

                <Campo label="Tipo de alerta">
                  <select
                    value={filtros.alerta}
                    onChange={(e) => actualizarFiltro("alerta", e.target.value)}
                    className={campo}
                  >
                    <option value="todas">Todas las alertas</option>
                    {opcionesAlertas.map((alerta) => (
                      <option key={alerta} value={alerta}>
                        {alerta}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
            )}

            {hayFiltros && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">Filtros activos:</span>
                  {chipsActivos.map((chip) => (
                    <span
                      key={chip.clave}
                      className="inline-flex max-w-[260px] items-center gap-1 rounded-full bg-[#e9f0e8] py-1 pl-3 pr-1.5 text-xs font-medium text-[#2f4a2b]"
                    >
                      <span className="truncate">{chip.texto}</span>
                      <button
                        type="button"
                        aria-label={`Quitar filtro ${chip.texto}`}
                        onClick={() =>
                          actualizarFiltro(chip.clave, FILTROS_INICIALES[chip.clave])
                        }
                        className={`rounded-full p-0.5 hover:bg-[#466b3f]/15 ${foco}`}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className={`inline-flex items-center gap-1.5 rounded text-sm font-medium text-[#466b3f] hover:underline ${foco}`}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </Card>

        {/* TABLA */}
        <Card>
          <CardHeader
            title="Planillas por estudiante"
            description={`${filtrados.length} de ${estudiantes.length} estudiantes`}
          />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-y border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600">
                <tr>
                  <th scope="col" className="px-5 py-3">Estudiante</th>
                  <th scope="col" className="hidden px-4 py-3 md:table-cell">IPS y práctica</th>
                  <th scope="col" className="hidden px-4 py-3 text-right lg:table-cell">Reportes</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                  <th scope="col" className="hidden px-4 py-3 lg:table-cell">Meses faltantes</th>
                  <th scope="col" className="hidden px-4 py-3 xl:table-cell">Alertas</th>
                  <th scope="col" className="px-5 py-3 text-right">
                    <span className="sr-only">Acción</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <Skeleton />
                ) : estudiantesPagina.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <Search className="mx-auto mb-3 h-8 w-8 text-gray-300" aria-hidden />
                      <p className="font-semibold text-gray-800">
                        Ningún estudiante coincide con los filtros
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Amplía la búsqueda o quita algún filtro.
                      </p>
                      {hayFiltros && (
                        <button
                          type="button"
                          onClick={limpiarFiltros}
                          className={`mt-4 rounded text-sm font-medium text-[#466b3f] hover:underline ${foco}`}
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  estudiantesPagina.map((est, index) => {
                    const alertas = obtenerAlertas(est);
                    const estado = obtenerEstado(est);
                    const tiposAlerta = [...new Set(alertas)];

                    return (
                      <tr
                        key={`${est.documento}-${index}`}
                        tabIndex={0}
                        onClick={() => abrirHistorial(est)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            abrirHistorial(est);
                          }
                        }}
                        className={`cursor-pointer transition-colors hover:bg-[#f6f9f5] focus-visible:bg-[#f6f9f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#466b3f]/40`}
                      >
                        <td className={`border-l-4 px-5 py-3.5 ${ESTADOS[estado].franja}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#e9f0e8] text-xs font-bold text-[#2f4a2b]">
                              {iniciales(est.nombre)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900">
                                {est.nombre || "Sin nombre"}
                              </p>
                              <p className="mt-0.5 text-xs tabular-nums text-gray-500">
                                CC {est.documento || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="hidden px-4 py-3.5 md:table-cell">
                          <div className="flex items-start gap-2">
                            <Building2 className="mt-0.5 h-4 w-4 flex-none text-gray-400" aria-hidden />
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {est.ips || "Sin IPS"}
                              </p>
                              <p className="mt-0.5 text-xs tabular-nums text-gray-500">
                                {est.inicio_practica || "—"} a {est.fin_practica || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="hidden px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-gray-800 lg:table-cell">
                          {est.total_reportes}
                        </td>

                        <td className="px-4 py-3.5">
                          <EstadoPill estado={estado} />
                        </td>

                        <td className="hidden px-4 py-3.5 lg:table-cell">
                          {est.meses_faltantes.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" aria-hidden />
                              Sin faltantes
                            </span>
                          ) : (
                            <div className="flex max-w-[220px] flex-wrap gap-1">
                              {est.meses_faltantes.slice(0, 3).map((m) => (
                                <span
                                  key={m}
                                  className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
                                >
                                  {etiquetaPeriodo(m)}
                                </span>
                              ))}
                              {est.meses_faltantes.length > 3 && (
                                <span
                                  className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600"
                                  title={est.meses_faltantes.map(etiquetaPeriodo).join(", ")}
                                >
                                  +{est.meses_faltantes.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="hidden px-4 py-3.5 xl:table-cell">
                          {alertas.length === 0 ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            <div className="max-w-[240px]">
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                                <AlertTriangle className="h-4 w-4" aria-hidden />
                                {alertas.length} {alertas.length === 1 ? "alerta" : "alertas"}
                              </p>
                              <p
                                className="mt-0.5 truncate text-xs text-gray-500"
                                title={tiposAlerta.join(" • ")}
                              >
                                {tiposAlerta[0]}
                                {tiposAlerta.length > 1 ? ` +${tiposAlerta.length - 1}` : ""}
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              abrirHistorial(est);
                            }}
                          >
                            <History aria-hidden className="size-4" />
                            Historial
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
          <nav
            aria-label="Paginación"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-3"
          >
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="tabular-nums">
                {filtrados.length === 0
                  ? "0 resultados"
                  : `${desde + 1}–${Math.min(desde + itemsPorPagina, filtrados.length)} de ${filtrados.length}`}
              </span>
              <label className="flex items-center gap-2">
                Filas por página
                <select
                  value={itemsPorPagina}
                  onChange={(e) => {
                    setItemsPorPagina(Number(e.target.value));
                    setPagina(1);
                  }}
                  className={`rounded-md border border-gray-300 bg-white px-2 py-1 text-xs ${foco}`}
                >
                  {OPCIONES_PAGINA.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={paginaActual <= 1}
                onClick={() => setPagina(paginaActual - 1)}
                className={`rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30 ${foco}`}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>

              {rangoPaginas(paginaActual, totalPaginas).map((n, i) =>
                n === "…" ? (
                  <span key={`e${i}`} className="px-1.5 text-xs text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPagina(n)}
                    aria-current={n === paginaActual ? "page" : undefined}
                    className={`h-9 min-w-9 rounded-lg px-2 text-xs font-semibold tabular-nums ${foco} ${
                      n === paginaActual
                        ? "bg-[#466b3f] text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {n}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPagina(paginaActual + 1)}
                className={`rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30 ${foco}`}
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </nav>
        </Card>

        {/* AVISOS */}
        {avisos.length > 0 && (
          <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Consideraciones de auditoría
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-9 text-sm text-amber-900/90">
              {avisos.map((aviso, index) => (
                <li key={index}>{aviso}</li>
              ))}
            </ul>
          </aside>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-8 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-gray-500 sm:px-6 lg:px-10">
          <p>
            <span className="font-semibold text-[#466b3f]">UNAL RIM</span> · Seguimiento
            y auditoría de internos
          </p>
          <p>© {new Date().getFullYear()} Universidad Nacional de Colombia</p>
        </div>
      </footer>

      {/* HISTORIAL */}
      {seleccionado && (
        <Dialog
          open={!!seleccionado}
          onClose={() => setSeleccionado(null)}
          size="lg"
          title={`Historial - ${seleccionado.nombre}`}
          description={`CC ${seleccionado.documento} · ${seleccionado.ips || "Sin IPS"}`}
        >
          <div className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 md:grid-cols-4">
              {[
                { t: "Planillas cargadas", v: String(seleccionado.historico.length) },
                { t: "Meses pendientes", v: String(seleccionado.meses_faltantes.length) },
                { t: "Alertas", v: String(obtenerAlertas(seleccionado).length) },
                {
                  t: "Práctica",
                  v: `${seleccionado.inicio_practica || "—"} a ${seleccionado.fin_practica || "—"}`,
                  chico: true,
                },
              ].map((d) => (
                <div key={d.t} className="bg-white p-4">
                  <dt className="text-xs text-gray-500">{d.t}</dt>
                  <dd
                    className={`mt-1 font-semibold tabular-nums text-gray-900 ${d.chico ? "text-sm leading-7" : "text-2xl"}`}
                  >
                    {d.v}
                  </dd>
                </div>
              ))}
            </dl>

            {seleccionado.meses_faltantes.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 text-sm font-semibold text-amber-900">
                  Meses sin reporte
                </p>
                <div className="flex flex-wrap gap-2">
                  {seleccionado.meses_faltantes.map((mes) => (
                    <span
                      key={mes}
                      className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
                    >
                      {etiquetaPeriodo(mes)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold text-gray-900">
                  Planillas ({historialVisible.length}
                  {soloAlertasHistorial ? ` de ${seleccionado.historico.length}` : ""})
                </h3>

                <div
                  role="group"
                  aria-label="Filtrar planillas"
                  className="inline-flex rounded-lg border border-gray-300 p-0.5 text-xs font-medium"
                >
                  {[
                    { v: false, t: "Todas" },
                    { v: true, t: "Solo con alertas" },
                  ].map((o) => (
                    <button
                      key={o.t}
                      type="button"
                      aria-pressed={soloAlertasHistorial === o.v}
                      onClick={() => setSoloAlertasHistorial(o.v)}
                      className={`rounded-md px-3 py-1.5 ${foco} ${
                        soloAlertasHistorial === o.v
                          ? "bg-[#466b3f] text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {o.t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[380px] overflow-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-gray-50 font-semibold text-gray-600 shadow-[0_1px_0_#e5e7eb]">
                    <tr>
                      <th scope="col" className="px-3 py-3">Periodo</th>
                      <th scope="col" className="px-3 py-3">N° planilla</th>
                      <th scope="col" className="px-3 py-3 text-right">Valor</th>
                      <th scope="col" className="px-3 py-3">Fecha de pago</th>
                      <th scope="col" className="px-3 py-3">PDF</th>
                      <th scope="col" className="px-3 py-3">Alertas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historialVisible.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                          No hay planillas para mostrar.
                        </td>
                      </tr>
                    ) : (
                      historialVisible.map((h, idx) => (
                        <tr
                          key={idx}
                          className={`align-top hover:bg-gray-50 ${
                            h.alertas.length > 0 ? "bg-red-50/40" : ""
                          }`}
                        >
                          <td className="px-3 py-3 font-semibold">
                            {etiquetaPeriodo(h.periodo)}
                          </td>
                          <td className="px-3 py-3 font-mono tabular-nums">
                            {h.numero_planilla || "—"}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums">
                            {formatoCOP.format(h.valor_planilla || 0)}
                            {h.valor_diferente && h.valor_esperado != null && (
                              <p className="mt-0.5 text-[11px] font-medium text-red-600">
                                Esperado {formatoCOP.format(h.valor_esperado)}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 tabular-nums">{h.fecha_pago || "—"}</td>
                          <td className="px-3 py-3">
                            {h.pdf_nombre ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                Registrado
                              </span>
                            ) : (
                              <span className="font-semibold text-red-700">Sin adjunto</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {h.alertas.length === 0 ? (
                              <span className="text-gray-400">—</span>
                            ) : (
                              <div className="flex max-w-[260px] flex-wrap gap-1">
                                {h.alertas.map((alerta, i) => (
                                  <span
                                    key={i}
                                    className="rounded-md bg-red-50 px-2 py-0.5 font-medium text-red-700 ring-1 ring-inset ring-red-200"
                                  >
                                    {alerta}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSeleccionado(null)}
                className={boton}
              >
                Cerrar
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
