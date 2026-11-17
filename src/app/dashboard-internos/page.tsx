"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  History,
  Users,
  FileText,
  CalendarClock,
  ShieldCheck,
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

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

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
  const etiquetaEstado: Record<Estado, string> = {
    "al-dia": "Al día",
    pendiente: "Pendiente",
    alertas: "Con alertas",
  };
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const filas = estudiantes.map((e) =>
    [
      e.documento,
      e.nombre,
      e.ips,
      e.inicio_practica,
      e.fin_practica,
      e.total_reportes,
      etiquetaEstado[obtenerEstado(e)],
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

const selectClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#466b3f] focus:ring-2 focus:ring-[#466b3f]/15";

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function EstadoPill({ estado }: { estado: Estado }) {
  if (estado === "al-dia") return <Badge tone="success">Al día</Badge>;
  if (estado === "pendiente")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700 ring-1 ring-inset ring-orange-200">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
        Pendiente
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-200">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Con alertas
    </span>
  );
}

function Skeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-100" />
              <div className="space-y-2">
                <div className="h-3 w-40 rounded bg-gray-100" />
                <div className="h-2.5 w-24 rounded bg-gray-100" />
              </div>
            </div>
          </td>
          {Array.from({ length: 5 }).map((__, j) => (
            <td key={j} className="px-4 py-4">
              <div className="h-3 w-20 rounded bg-gray-100" />
            </td>
          ))}
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

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(
    () => ({
      internos: filtrados.length,
      reportes: filtrados.reduce((t, e) => t + e.total_reportes, 0),
      pendientes: filtrados.reduce((t, e) => t + e.meses_faltantes.length, 0),
      alertas: filtrados.reduce((t, e) => t + obtenerAlertas(e).length, 0),
      alDia: filtrados.filter((e) => obtenerEstado(e) === "al-dia").length,
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

  const etiquetasEstado: Record<string, string> = {
    "al-dia": "Al día",
    pendiente: "Con meses pendientes",
    alertas: "Con alertas",
  };

  const chipsActivos: { clave: keyof Filtros; texto: string }[] = [];
  if (filtros.busqueda)
    chipsActivos.push({ clave: "busqueda", texto: `“${filtros.busqueda}”` });
  if (filtros.ips !== "todas")
    chipsActivos.push({ clave: "ips", texto: filtros.ips });
  if (filtros.estado !== "todos")
    chipsActivos.push({
      clave: "estado",
      texto: etiquetasEstado[filtros.estado],
    });
  if (filtros.anio !== "todos")
    chipsActivos.push({ clave: "anio", texto: `Año ${filtros.anio}` });
  if (filtros.mes !== "todos")
    chipsActivos.push({
      clave: "mes",
      texto: MESES[Number(filtros.mes) - 1],
    });
  if (filtros.alerta !== "todas")
    chipsActivos.push({ clave: "alerta", texto: filtros.alerta });

  const hayFiltros = chipsActivos.length > 0;

  function quitarChip(clave: keyof Filtros) {
    actualizarFiltro(clave, FILTROS_INICIALES[clave]);
  }

  // ==========================================
  // KPI CARDS (clicables para filtrar estado)
  // ==========================================

  const kpis: {
    titulo: string;
    valor: number;
    icono: typeof Users;
    color: string;
    fondo: string;
    estado?: string;
  }[] = [
    {
      titulo: "Total internos",
      valor: indicadores.internos,
      icono: Users,
      color: "text-blue-700",
      fondo: "bg-blue-50",
      estado: "todos",
    },
    {
      titulo: "Reportes recibidos",
      valor: indicadores.reportes,
      icono: FileText,
      color: "text-indigo-700",
      fondo: "bg-indigo-50",
    },
    {
      titulo: "Meses pendientes",
      valor: indicadores.pendientes,
      icono: CalendarClock,
      color: "text-orange-700",
      fondo: "bg-orange-50",
      estado: "pendiente",
    },
    {
      titulo: "Alertas detectadas",
      valor: indicadores.alertas,
      icono: AlertTriangle,
      color: "text-red-700",
      fondo: "bg-red-50",
      estado: "alertas",
    },
    {
      titulo: "Internos al día",
      valor: indicadores.alDia,
      icono: ShieldCheck,
      color: "text-green-700",
      fondo: "bg-green-50",
      estado: "al-dia",
    },
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
    <div className="min-h-screen bg-[#f6f8f6]">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#5a8a50] to-[#365331] text-white shadow-sm">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#466b3f]">
                Universidad Nacional de Colombia
              </p>
              <h1 className="text-xl font-extrabold leading-tight text-gray-900">
                UNAL RIM
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 md:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Panel de auditoría
            </div>

            <button
              type="button"
              onClick={cargarDatos}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>

            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("unal_token");
                window.location.href = "/login-otp";
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#466b3f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#365331]"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 px-5 py-8 lg:px-10">
        {/* TÍTULO */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#466b3f]">
              Panel de seguimiento
            </p>
            <h2 className="text-2xl font-extrabold text-gray-900 md:text-3xl">
              Tablero de Control — Ley de Internos
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Auditoría mensual de aportes PILA, seguimiento de planillas y
              validación de soportes.
            </p>
          </div>

          <div className="text-xs text-gray-500">
            {ultimaActualizacion
              ? `Última consulta: ${ultimaActualizacion.toLocaleString("es-CO")}`
              : "Sin consulta registrada"}
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" />
            <div>
              <p className="font-bold">No se pudieron cargar los datos</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((item) => {
            const Icono = item.icono;
            const clicable = item.estado !== undefined;
            const activo = clicable && filtros.estado === item.estado;

            return (
              <button
                key={item.titulo}
                type="button"
                disabled={!clicable}
                onClick={() => item.estado && actualizarFiltro("estado", item.estado)}
                className={`group rounded-xl border bg-white p-5 text-left shadow-sm transition ${
                  activo
                    ? "border-[#466b3f] ring-2 ring-[#466b3f]/20"
                    : "border-gray-200"
                } ${clicable ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : "cursor-default"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-gray-500">
                    {item.titulo}
                  </span>
                  <div className={`rounded-lg p-2 ${item.fondo}`}>
                    <Icono className={`h-5 w-5 ${item.color}`} />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-gray-900">
                  {loading ? (
                    <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-100" />
                  ) : (
                    item.valor.toLocaleString("es-CO")
                  )}
                </p>
                {clicable && (
                  <p className="mt-1 text-[11px] text-gray-400 opacity-0 transition group-hover:opacity-100">
                    Clic para filtrar
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* FILTROS */}
        <Card>
          <CardBody>
            {/* Fila 1: búsqueda + acciones */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o documento..."
                  value={filtros.busqueda}
                  onChange={(e) => actualizarFiltro("busqueda", e.target.value)}
                  className={`${selectClass} pl-9 pr-9`}
                />
                {filtros.busqueda && (
                  <button
                    type="button"
                    aria-label="Borrar búsqueda"
                    onClick={() => actualizarFiltro("busqueda", "")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                <select
                  value={orden}
                  onChange={(e) => {
                    setOrden(e.target.value as Orden);
                    setPagina(1);
                  }}
                  className={`${selectClass} w-auto`}
                  aria-label="Ordenar por"
                >
                  <option value="nombre">Ordenar: Nombre (A-Z)</option>
                  <option value="pendientes">Más meses pendientes</option>
                  <option value="alertas">Más alertas</option>
                  <option value="reportes">Más reportes</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setFiltrosAvanzados((v) => !v)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                aria-expanded={filtrosAvanzados}
              >
                <Filter className="h-4 w-4 text-[#466b3f]" />
                Más filtros
                <ChevronDown
                  className={`h-4 w-4 transition ${filtrosAvanzados ? "rotate-180" : ""}`}
                />
              </button>

              <button
                type="button"
                onClick={() => exportarCSV(filtrados)}
                disabled={filtrados.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
            </div>

            {/* Fila 2: chips de estado con conteo */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { v: "todos", t: "Todos", n: conteosEstado.todos },
                { v: "al-dia", t: "Al día", n: conteosEstado["al-dia"] },
                { v: "pendiente", t: "Pendientes", n: conteosEstado.pendiente },
                { v: "alertas", t: "Con alertas", n: conteosEstado.alertas },
              ].map((c) => {
                const activo = filtros.estado === c.v;
                return (
                  <button
                    key={c.v}
                    type="button"
                    onClick={() => actualizarFiltro("estado", c.v)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold transition ${
                      activo
                        ? "border-[#466b3f] bg-[#466b3f] text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-[#466b3f]/50"
                    }`}
                  >
                    {c.t}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        activo ? "bg-white/20" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {loading ? "…" : c.n}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filtros avanzados */}
            {filtrosAvanzados && (
              <div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 md:grid-cols-2 xl:grid-cols-4">
                <Campo label="Institución / IPS">
                  <select
                    value={filtros.ips}
                    onChange={(e) => actualizarFiltro("ips", e.target.value)}
                    className={selectClass}
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
                    className={selectClass}
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
                    className={selectClass}
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
                    className={selectClass}
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

            {/* Filtros activos */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-gray-500">
                  Mostrando{" "}
                  <strong className="text-gray-900">{filtrados.length}</strong>{" "}
                  de {estudiantes.length} estudiantes
                </p>

                {chipsActivos.map((chip) => (
                  <span
                    key={chip.clave}
                    className="inline-flex max-w-[260px] items-center gap-1 rounded-full bg-[#eef3ee] py-1 pl-3 pr-1.5 text-xs font-semibold text-[#365331]"
                  >
                    <span className="truncate">{chip.texto}</span>
                    <button
                      type="button"
                      aria-label={`Quitar filtro ${chip.texto}`}
                      onClick={() => quitarChip(chip.clave)}
                      className="rounded-full p-0.5 hover:bg-[#466b3f]/15"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              {hayFiltros && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#466b3f] hover:underline"
                >
                  <RotateCcw className="h-4 w-4" />
                  Limpiar todo
                </button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* TABLA */}
        <Card>
          <CardHeader title="Auditoría de Planillas" />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-[#eef3ee] text-xs font-bold uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-5 py-4">Estudiante</th>
                  <th className="px-4 py-4">IPS / Práctica</th>
                  <th className="px-4 py-4">Reportes</th>
                  <th className="px-4 py-4">Estado</th>
                  <th className="px-4 py-4">Meses faltantes</th>
                  <th className="px-4 py-4">Alertas</th>
                  <th className="px-5 py-4 text-right">Acción</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <Skeleton />
                ) : estudiantesPagina.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-14 text-center">
                      <Search className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                      <p className="font-semibold text-gray-700">
                        No se encontraron registros
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Prueba ajustando o limpiando los filtros.
                      </p>
                      {hayFiltros && (
                        <button
                          type="button"
                          onClick={limpiarFiltros}
                          className="mt-4 text-xs font-bold text-[#466b3f] hover:underline"
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
                        className="cursor-pointer transition hover:bg-[#f8faf8]"
                        onClick={() => {
                          setSoloAlertasHistorial(false);
                          setSeleccionado(est);
                        }}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#eef3ee] text-xs font-extrabold text-[#365331]">
                              {iniciales(est.nombre)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">
                                {est.nombre || "Sin nombre"}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                CC: {est.documento || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <Building2 className="mt-0.5 h-4 w-4 flex-none text-gray-400" />
                            <div>
                              <p className="text-xs font-bold text-gray-700">
                                {est.ips || "Sin IPS"}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {est.inicio_practica || "—"} →{" "}
                                {est.fin_practica || "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                            {est.total_reportes}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <EstadoPill estado={estado} />
                        </td>

                        <td className="px-4 py-4">
                          {est.meses_faltantes.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Sin faltantes
                            </span>
                          ) : (
                            <div className="flex max-w-[220px] flex-wrap gap-1">
                              {est.meses_faltantes.slice(0, 3).map((m) => (
                                <span
                                  key={m}
                                  className="rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700"
                                >
                                  {etiquetaPeriodo(m)}
                                </span>
                              ))}
                              {est.meses_faltantes.length > 3 && (
                                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                                  +{est.meses_faltantes.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {alertas.length === 0 ? (
                            <span className="text-xs font-semibold text-green-700">
                              Sin alertas
                            </span>
                          ) : (
                            <div className="max-w-[220px]">
                              <div className="flex items-center gap-1.5 text-red-700">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-xs font-bold">
                                  {alertas.length} alerta(s)
                                </span>
                              </div>
                              <p
                                className="mt-1 truncate text-[11px] text-gray-500"
                                title={tiposAlerta.join(" • ")}
                              >
                                {tiposAlerta[0]}
                                {tiposAlerta.length > 1
                                  ? ` +${tiposAlerta.length - 1}`
                                  : ""}
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setSoloAlertasHistorial(false);
                              setSeleccionado(est);
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
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-5 py-4">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                {filtrados.length === 0
                  ? "0 resultados"
                  : `${desde + 1}–${Math.min(desde + itemsPorPagina, filtrados.length)} de ${filtrados.length}`}
              </span>
              <label className="flex items-center gap-2">
                Filas:
                <select
                  value={itemsPorPagina}
                  onChange={(e) => {
                    setItemsPorPagina(Number(e.target.value));
                    setPagina(1);
                  }}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
                >
                  {OPCIONES_PAGINA.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                type="button"
                disabled={paginaActual <= 1}
                onClick={() => setPagina(paginaActual - 1)}
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPagina(paginaActual + 1)}
                className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        {/* AVISOS */}
        {avisos.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              Consideraciones de auditoría
            </div>
            {avisos.map((aviso, index) => (
              <p key={index} className="mt-1 text-xs text-amber-800">
                {aviso}
              </p>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-10 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-6 lg:px-10">
          <div>
            <p className="text-sm font-extrabold text-[#466b3f]">UNAL RIM</p>
            <p className="mt-1 text-xs text-gray-500">
              Universidad Nacional de Colombia
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Sistema de seguimiento y auditoría de internos
          </div>
          <div className="text-xs text-gray-400">
            © {new Date().getFullYear()} — Todos los derechos reservados
          </div>
        </div>
      </footer>

      {/* HISTORIAL */}
      {seleccionado && (
        <Dialog
          open={!!seleccionado}
          onClose={() => setSeleccionado(null)}
          size="lg"
          title={`Historial - ${seleccionado.nombre}`}
          description={`CC: ${seleccionado.documento} · ${seleccionado.ips || "Sin IPS"}`}
        >
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs text-blue-700">Planillas cargadas</p>
                <p className="mt-1 text-2xl font-extrabold text-blue-900">
                  {seleccionado.historico.length}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-4">
                <p className="text-xs text-orange-700">Meses pendientes</p>
                <p className="mt-1 text-2xl font-extrabold text-orange-900">
                  {seleccionado.meses_faltantes.length}
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-xs text-red-700">Alertas</p>
                <p className="mt-1 text-2xl font-extrabold text-red-900">
                  {obtenerAlertas(seleccionado).length}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-600">Práctica</p>
                <p className="mt-1 text-xs font-bold text-gray-900">
                  {seleccionado.inicio_practica || "—"} →{" "}
                  {seleccionado.fin_practica || "—"}
                </p>
              </div>
            </div>

            {seleccionado.meses_faltantes.length > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="mb-2 text-sm font-bold text-orange-900">
                  Meses sin reporte
                </p>
                <div className="flex flex-wrap gap-2">
                  {seleccionado.meses_faltantes.map((mes) => (
                    <span
                      key={mes}
                      className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-orange-700"
                    >
                      {etiquetaPeriodo(mes)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900">
                  Planillas ({historialVisible.length}
                  {soloAlertasHistorial
                    ? ` de ${seleccionado.historico.length}`
                    : ""}
                  )
                </h3>

                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setSoloAlertasHistorial(false)}
                    className={`rounded-md px-3 py-1.5 ${
                      !soloAlertasHistorial
                        ? "bg-[#466b3f] text-white"
                        : "text-gray-600"
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoloAlertasHistorial(true)}
                    className={`rounded-md px-3 py-1.5 ${
                      soloAlertasHistorial
                        ? "bg-[#466b3f] text-white"
                        : "text-gray-600"
                    }`}
                  >
                    Solo con alertas
                  </button>
                </div>
              </div>

              <div className="max-h-[380px] overflow-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead className="sticky top-0 bg-[#eef3ee] font-bold uppercase text-gray-600">
                    <tr>
                      <th className="px-3 py-3">Periodo</th>
                      <th className="px-3 py-3">N° Planilla</th>
                      <th className="px-3 py-3">Valor</th>
                      <th className="px-3 py-3">Fecha pago</th>
                      <th className="px-3 py-3">PDF</th>
                      <th className="px-3 py-3">Alertas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historialVisible.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-8 text-center text-gray-500"
                        >
                          No hay planillas para mostrar.
                        </td>
                      </tr>
                    ) : (
                      historialVisible.map((h, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-3 font-bold">
                            {etiquetaPeriodo(h.periodo)}
                          </td>
                          <td className="px-3 py-3 font-mono">
                            {h.numero_planilla || "—"}
                          </td>
                          <td className="px-3 py-3 font-bold tabular-nums">
                            {formatoCOP.format(h.valor_planilla || 0)}
                            {h.valor_diferente && h.valor_esperado != null && (
                              <p className="mt-0.5 text-[10px] font-semibold text-red-600">
                                Esperado: {formatoCOP.format(h.valor_esperado)}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3">{h.fecha_pago || "—"}</td>
                          <td className="px-3 py-3">
                            {h.pdf_nombre ? (
                              <span className="text-green-700">Registrado</span>
                            ) : (
                              <span className="font-bold text-red-700">
                                Sin adjunto
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {h.alertas.length === 0 ? (
                              <Badge tone="success">Sin alertas</Badge>
                            ) : (
                              <div className="max-w-[260px] space-y-1">
                                {h.alertas.map((alerta, i) => (
                                  <p
                                    key={i}
                                    className="text-xs font-semibold text-red-700"
                                  >
                                    • {alerta}
                                  </p>
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
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Cerrar historial
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
