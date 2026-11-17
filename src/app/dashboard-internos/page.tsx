
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
  X,
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

const ITEMS_POR_PAGINA = 15;

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function obtenerAlertas(estudiante: Estudiante) {
  return estudiante.historico.flatMap(
    (planilla) => planilla.alertas || []
  );
}

function tieneAlertas(estudiante: Estudiante) {
  return obtenerAlertas(estudiante).length > 0;
}

function estaPendiente(estudiante: Estudiante) {
  return estudiante.meses_faltantes.length > 0;
}

function obtenerEstado(estudiante: Estudiante) {
  if (estaPendiente(estudiante)) return "pendiente";
  if (tieneAlertas(estudiante)) return "alertas";
  return "al-dia";
}

function normalizar(texto: unknown) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function DashboardInternosPage() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [avisos, setAvisos] = useState<string[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroIPS, setFiltroIPS] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroAnio, setFiltroAnio] = useState("todos");
  const [filtroMes, setFiltroMes] = useState("todos");
  const [filtroAlerta, setFiltroAlerta] = useState("todas");

  const [pagina, setPagina] = useState(1);
  const [estudianteSeleccionado, setEstudianteSeleccionado] =
    useState<Estudiante | null>(null);

  const [ultimaActualizacion, setUltimaActualizacion] =
    useState<Date | null>(null);

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

      const respuesta = await fetch(
        "/.netlify/functions/audit_dashboard",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data: RespuestaAuditoria = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.error || "No fue posible consultar REDCap."
        );
      }

      setEstudiantes(
        Array.isArray(data.estudiantes) ? data.estudiantes : []
      );

      setAvisos(
        Array.isArray(data.avisos) ? data.avisos : []
      );

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

  const opcionesIPS = useMemo(() => {
    return [...new Set(
      estudiantes.map((e) => e.ips).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "es"));
  }, [estudiantes]);

  const opcionesAnios = useMemo(() => {
    const anios = new Set<string>();

    estudiantes.forEach((e) => {
      e.historico.forEach((h) => {
        if (/^\d{4}-\d{2}$/.test(h.periodo)) {
          anios.add(h.periodo.slice(0, 4));
        }
      });

      e.meses_faltantes.forEach((periodo) => {
        if (/^\d{4}-\d{2}$/.test(periodo)) {
          anios.add(periodo.slice(0, 4));
        }
      });
    });

    return [...anios].sort().reverse();
  }, [estudiantes]);

  const opcionesAlertas = useMemo(() => {
    return [...new Set(
      estudiantes.flatMap(obtenerAlertas)
    )].sort((a, b) => a.localeCompare(b, "es"));
  }, [estudiantes]);

  // ==========================================
  // FILTRADO
  // ==========================================

  const filtrados = useMemo(() => {
    return estudiantes.filter((est) => {
      const coincideBusqueda =
        normalizar(est.nombre).includes(normalizar(busqueda)) ||
        normalizar(est.documento).includes(normalizar(busqueda));

      const coincideIPS =
        filtroIPS === "todas" || est.ips === filtroIPS;

      const estado = obtenerEstado(est);

      const coincideEstado =
        filtroEstado === "todos" ||
        estado === filtroEstado;

      const coincideAlerta =
        filtroAlerta === "todas" ||
        obtenerAlertas(est).includes(filtroAlerta);

      const periodos = [
        ...est.historico.map((h) => h.periodo),
        ...est.meses_faltantes,
      ];

      const coincideAnio =
        filtroAnio === "todos" ||
        periodos.some((p) => p?.startsWith(`${filtroAnio}-`));

      const coincideMes =
        filtroMes === "todos" ||
        periodos.some((p) => p?.slice(5, 7) === filtroMes);

      const coincidePeriodo =
        filtroAnio === "todos" || filtroMes === "todos"
          ? coincideAnio && coincideMes
          : periodos.some(
              (p) => p === `${filtroAnio}-${filtroMes}`
            );

      return (
        coincideBusqueda &&
        coincideIPS &&
        coincideEstado &&
        coincideAlerta &&
        coincidePeriodo
      );
    });
  }, [
    estudiantes,
    busqueda,
    filtroIPS,
    filtroEstado,
    filtroAnio,
    filtroMes,
    filtroAlerta,
  ]);

  // ==========================================
  // INDICADORES
  // ==========================================

  const indicadores = useMemo(() => {
    const totalReportes = filtrados.reduce(
      (total, e) => total + e.total_reportes,
      0
    );

    const mesesPendientes = filtrados.reduce(
      (total, e) => total + e.meses_faltantes.length,
      0
    );

    const totalAlertas = filtrados.reduce(
      (total, e) => total + obtenerAlertas(e).length,
      0
    );

    const estudiantesAlDia = filtrados.filter(
      (e) => obtenerEstado(e) === "al-dia"
    ).length;

    return {
      internos: filtrados.length,
      reportes: totalReportes,
      pendientes: mesesPendientes,
      alertas: totalAlertas,
      alDia: estudiantesAlDia,
    };
  }, [filtrados]);

  // ==========================================
  // PAGINACIÓN
  // ==========================================

  const totalPaginas = Math.max(
    1,
    Math.ceil(filtrados.length / ITEMS_POR_PAGINA)
  );

  const paginaActual = Math.min(pagina, totalPaginas);

  const estudiantesPagina = filtrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroIPS("todas");
    setFiltroEstado("todos");
    setFiltroAnio("todos");
    setFiltroMes("todos");
    setFiltroAlerta("todas");
    setPagina(1);
  }

  function cerrarSesion() {
    localStorage.removeItem("unal_token");
    window.location.href = "/login-otp";
  }

  const selectClass =
    "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-[#466b3f] focus:ring-2 focus:ring-[#466b3f]/15";

  // ==========================================
  // RENDERIZADO
  // ==========================================

  return (
    <div className="min-h-screen bg-[#f6f8f6]">

      {/* =====================================
          HEADER INSTITUCIONAL
      ===================================== */}

      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-10">

          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#466b3f] text-white">
              <GraduationCap className="h-8 w-8" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#466b3f]">
                Universidad Nacional de Colombia
              </p>
              <h1 className="text-xl font-extrabold text-gray-900 md:text-2xl">
                UNAL RIM
              </h1>
              <p className="text-xs text-gray-500">
                Registro y seguimiento de internos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-xs font-semibold text-green-700 md:flex">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Panel de auditoría
            </div>

            <button
              type="button"
              onClick={cargarDatos}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Actualizar
            </button>

            <button
              type="button"
              onClick={cerrarSesion}
              className="inline-flex items-center gap-2 rounded-lg bg-[#466b3f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#365331]"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* =====================================
          CONTENIDO PRINCIPAL
      ===================================== */}

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
              Auditoría mensual de aportes PILA, seguimiento de
              planillas y validación de soportes.
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
              <p className="font-bold">
                No se pudieron cargar los datos
              </p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* =====================================
            TARJETAS DE INDICADORES
        ===================================== */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

          {[
            {
              titulo: "Total internos",
              valor: indicadores.internos,
              icono: Users,
              color: "text-blue-700",
              fondo: "bg-blue-50",
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
            },
            {
              titulo: "Alertas detectadas",
              valor: indicadores.alertas,
              icono: AlertTriangle,
              color: "text-red-700",
              fondo: "bg-red-50",
            },
            {
              titulo: "Internos al día",
              valor: indicadores.alDia,
              icono: ShieldCheck,
              color: "text-green-700",
              fondo: "bg-green-50",
            },
          ].map((item) => {
            const Icono = item.icono;

            return (
              <div
                key={item.titulo}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
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
                  {loading ? "—" : item.valor.toLocaleString("es-CO")}
                </p>
              </div>
            );
          })}
        </div>

        {/* =====================================
            FILTROS
        ===================================== */}

        <Card>
          <CardBody>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-[#466b3f]" />
                <h3 className="text-base font-extrabold text-gray-900">
                  Filtros de consulta
                </h3>
              </div>

              <button
                type="button"
                onClick={limpiarFiltros}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#466b3f] hover:underline"
              >
                <RotateCcw className="h-4 w-4" />
                Limpiar filtros
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

              {/* BÚSQUEDA */}

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-600">
                  Buscar estudiante
                </label>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="search"
                    placeholder="Nombre o documento..."
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setPagina(1);
                    }}
                    className={`${selectClass} pl-9`}
                  />
                </div>
              </div>

              {/* IPS */}

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-600">
                  Institución / IPS
                </label>

                <select
                  value={filtroIPS}
                  onChange={(e) => {
                    setFiltroIPS(e.target.value);
                    setPagina(1);
                  }}
                  className={selectClass}
                >
                  <option value="todas">Todas las IPS</option>

                  {opcionesIPS.map((ips) => (
                    <option key={ips} value={ips}>
                      {ips}
                    </option>
                  ))}
                </select>
              </div>

              {/* ESTADO */}

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-600">
                  Estado de auditoría
                </label>

                <select
                  value={filtroEstado}
                  onChange={(e) => {
                    setFiltroEstado(e.target.value);
                    setPagina(1);
                  }}
                  className={selectClass}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="al-dia">Al día</option>
                  <option value="pendiente">Con meses pendientes</option>
                  <option value="alertas">Con alertas y sin meses pendientes</option>
                </select>
              </div>

              {/* AÑO */}

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-600">
                  Año
                </label>

                <select
                  value={filtroAnio}
                  onChange={(e) => {
                    setFiltroAnio(e.target.value);
                    setPagina(1);
                  }}
                  className={selectClass}
                >
                  <option value="todos">Todos los años</option>

                  {opcionesAnios.map((anio) => (
                    <option key={anio} value={anio}>
                      {anio}
                    </option>
                  ))}
                </select>
              </div>

              {/* MES */}

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-600">
                  Mes
                </label>

                <select
                  value={filtroMes}
                  onChange={(e) => {
                    setFiltroMes(e.target.value);
                    setPagina(1);
                  }}
                  className={selectClass}
                >
                  <option value="todos">Todos los meses</option>

                  {[
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
                  ].map((mes, index) => (
                    <option
                      key={mes}
                      value={String(index + 1).padStart(2, "0")}
                    >
                      {mes}
                    </option>
                  ))}
                </select>
              </div>

              {/* ALERTAS */}

              <div>
                <label className="mb-1.5 block text-xs font-bold text-gray-600">
                  Tipo de alerta
                </label>

                <select
                  value={filtroAlerta}
                  onChange={(e) => {
                    setFiltroAlerta(e.target.value);
                    setPagina(1);
                  }}
                  className={selectClass}
                >
                  <option value="todas">Todas las alertas</option>

                  {opcionesAlertas.map((alerta) => (
                    <option key={alerta} value={alerta}>
                      {alerta}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500">
                Mostrando{" "}
                <strong className="text-gray-900">
                  {filtrados.length}
                </strong>{" "}
                de {estudiantes.length} estudiantes
              </p>

              <p className="text-xs text-gray-400">
                Los filtros se combinan automáticamente
              </p>
            </div>
          </CardBody>
        </Card>

        {/* =====================================
            TABLA PRINCIPAL
        ===================================== */}

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
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-gray-500"
                    >
                      <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#466b3f]" />
                      Consultando información de REDCap...
                    </td>
                  </tr>
                ) : estudiantesPagina.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-gray-500"
                    >
                      No se encontraron registros con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  estudiantesPagina.map((est, index) => {
                    const alertas = obtenerAlertas(est);
                    const estado = obtenerEstado(est);

                    return (
                      <tr
                        key={`${est.documento}-${index}`}
                        className="transition hover:bg-[#f8faf8]"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900">
                            {est.nombre || "Sin nombre"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            CC: {est.documento || "—"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <Building2 className="mt-0.5 h-4 w-4 flex-none text-gray-400" />

                            <div>
                              <p className="text-xs font-bold text-gray-700">
                                {est.ips || "Sin IPS"}
                              </p>

                              <p className="mt-1 text-xs text-gray-500">
                                Inicio: {est.inicio_practica || "—"}
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
                          {estado === "al-dia" ? (
                            <Badge tone="success">Al día</Badge>
                          ) : estado === "pendiente" ? (
                            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">
                              Pendiente
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                              Con alertas
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {est.meses_faltantes.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Sin faltantes
                            </span>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-orange-700">
                                {est.meses_faltantes.length} pendiente(s)
                              </p>

                              <p className="mt-1 max-w-[190px] text-xs text-gray-500">
                                {est.meses_faltantes.slice(0, 3).join(", ")}
                                {est.meses_faltantes.length > 3 ? "..." : ""}
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {alertas.length === 0 ? (
                            <span className="text-xs font-semibold text-green-700">
                              Sin alertas
                            </span>
                          ) : (
                            <div className="flex items-center gap-2 text-red-700">
                              <AlertTriangle className="h-4 w-4" />

                              <span className="text-xs font-bold">
                                {alertas.length} alerta(s)
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEstudianteSeleccionado(est)}
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
            <p className="text-xs text-gray-500">
              Página {paginaActual} de {totalPaginas}
            </p>

            <div className="flex items-center gap-2">
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

        {/* AVISOS DEL BACKEND */}

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

      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="mt-10 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-6 lg:px-10">
          <div>
            <p className="text-sm font-extrabold text-[#466b3f]">
              UNAL RIM
            </p>

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

      {/* =====================================
          HISTORIAL DEL ESTUDIANTE
      ===================================== */}

      {estudianteSeleccionado && (
        <Dialog
          open={!!estudianteSeleccionado}
          onClose={() => setEstudianteSeleccionado(null)}
          size="lg"
          title={`Historial - ${estudianteSeleccionado.nombre}`}
          description={`CC: ${estudianteSeleccionado.documento}`}
        >
          <div className="flex flex-col gap-5">

            {/* RESUMEN */}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs text-blue-700">
                  Planillas cargadas
                </p>

                <p className="mt-1 text-2xl font-extrabold text-blue-900">
                  {estudianteSeleccionado.historico.length}
                </p>
              </div>

              <div className="rounded-lg bg-orange-50 p-4">
                <p className="text-xs text-orange-700">
                  Meses pendientes
                </p>

                <p className="mt-1 text-2xl font-extrabold text-orange-900">
                  {estudianteSeleccionado.meses_faltantes.length}
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-xs text-red-700">
                  Alertas
                </p>

                <p className="mt-1 text-2xl font-extrabold text-red-900">
                  {obtenerAlertas(estudianteSeleccionado).length}
                </p>
              </div>
            </div>

            {/* MESES FALTANTES */}

            {estudianteSeleccionado.meses_faltantes.length > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <p className="mb-2 text-sm font-bold text-orange-900">
                  Meses sin reporte
                </p>

                <div className="flex flex-wrap gap-2">
                  {estudianteSeleccionado.meses_faltantes.map((mes) => (
                    <span
                      key={mes}
                      className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-orange-700"
                    >
                      {mes}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* TABLA HISTORIAL */}

            <div>
              <h3 className="mb-3 font-bold text-gray-900">
                Planillas cargadas (
                {estudianteSeleccionado.historico.length})
              </h3>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full min-w-[750px] text-left text-xs">
                  <thead className="bg-[#eef3ee] font-bold uppercase text-gray-600">
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
                    {estudianteSeleccionado.historico.map((h, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-3 font-bold">
                          {h.periodo || "—"}
                        </td>

                        <td className="px-3 py-3 font-mono">
                          {h.numero_planilla || "—"}
                        </td>

                        <td className="px-3 py-3 font-bold tabular-nums">
                          {formatoCOP.format(h.valor_planilla || 0)}
                        </td>

                        <td className="px-3 py-3">
                          {h.fecha_pago || "—"}
                        </td>

                        <td className="px-3 py-3">
                          {h.pdf_nombre ? (
                            <span className="text-green-700">
                              Registrado
                            </span>
                          ) : (
                            <span className="font-bold text-red-700">
                              Sin adjunto
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          {h.alertas.length === 0 ? (
                            <Badge tone="success">
                              Sin alertas
                            </Badge>
                          ) : (
                            <div className="max-w-[250px] space-y-1">
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setEstudianteSeleccionado(null)}
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
