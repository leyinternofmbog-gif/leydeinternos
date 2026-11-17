"use client";

import { useEffect, useState } from "react";
import { Search, AlertTriangle, CheckCircle2, History } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";

export default function DashboardInternosPage() {
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<any | null>(null);

  useEffect(() => {
    fetch("/.netlify/functions/audit_dashboard", { headers: { Authorization: `Bearer ${localStorage.getItem("unal_token") || ""}` } })
      .then((res) => res.json())
      .then((data) => {
        setEstudiantes(data.estudiantes || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtrados = estudiantes.filter((e) =>
    [e.nombre, e.documento].some((val) => val?.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <>
      <PageHeader title="Tablero de Control - Ley de Internos" description="Auditoría mensual de aportes PILA y validación de soportes." />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-72 flex-1">
            <Search aria-hidden className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <input type="search" placeholder="Buscar por nombre o documento..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="h-10 w-full rounded-sm border border-line-strong bg-white pr-3 pl-9 text-sm focus:border-[#466b3f] focus:outline-none" />
          </div>
          <p className="text-sm font-bold text-ink-muted">Total internos: <span className="text-ink">{estudiantes.length}</span></p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Auditoría de Planillas" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-surface-muted text-[12px] font-bold tracking-wide text-ink-muted uppercase">
              <tr>
                <th className="px-5 py-3">Estudiante</th>
                <th className="px-4 py-3">IPS / Práctica</th>
                <th className="px-4 py-3">Meses Faltantes</th>
                <th className="px-4 py-3">Alertas Auditoría</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-muted">Cargando datos...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-ink-muted">Sin registros.</td></tr>
              ) : (
                filtrados.map((est) => {
                  const tieneAlertas = est.historico.some((h: any) => h.alertas.length > 0);
                  return (
                    <tr key={est.documento} className="hover:bg-surface-muted">
                      <td className="px-5 py-3.5"><p className="font-bold text-ink">{est.nombre}</p><p className="text-xs text-ink-muted">CC: {est.documento}</p></td>
                      <td className="px-5 py-3.5 text-xs text-ink-soft"><p className="font-bold">{est.ips || "—"}</p><p>Inicio: {est.inicio_practica}</p></td>
                      <td className="px-4 py-3.5">
                        {est.meses_faltantes.length === 0 ? <Badge tone="success">Al día</Badge> : <span className="text-xs font-bold text-unal-red">Faltan: {est.meses_faltantes.join(", ")}</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {est.meses_faltantes.length === 0 && !tieneAlertas ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#466b3f]"><CheckCircle2 className="size-4" /> Cumple estándar</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {est.historico.map((h: any, idx: number) => h.alertas.map((alerta: string, aIdx: number) => (
                              <span key={`${idx}-${aIdx}`} className="inline-flex items-center gap-1 text-xs font-bold text-unal-red"><AlertTriangle className="size-3.5 flex-none" /> [{h.periodo}] {alerta}</span>
                            )))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button variant="secondary" size="sm" onClick={() => setEstudianteSeleccionado(est)}><History aria-hidden className="size-4" /> Historial</Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {estudianteSeleccionado && (
        <Dialog open={!!estudianteSeleccionado} onClose={() => setEstudianteSeleccionado(null)} size="lg" title={`Historial - ${estudianteSeleccionado.nombre}`} description={`CC: ${estudianteSeleccionado.documento}`}>
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-ink">Planillas cargadas ({estudianteSeleccionado.historico.length})</h3>
            <div className="overflow-x-auto rounded-sm border border-line">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-muted uppercase text-ink-muted">
                  <tr>
                    <th className="px-3 py-2">Periodo</th>
                    <th className="px-3 py-2">N° Planilla</th>
                    <th className="px-3 py-2">Valor</th>
                    <th className="px-3 py-2">Fecha Pago</th>
                    <th className="px-3 py-2">PDF</th>
                    <th className="px-3 py-2">Alertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {estudianteSeleccionado.historico.map((h: any, idx: number) => (
                    <tr key={idx} className="hover:bg-surface-muted">
                      <td className="px-3 py-2 font-bold">{h.periodo}</td>
                      <td className="px-3 py-2 font-mono">{h.numero_planilla || "—"}</td>
                      <td className="px-3 py-2 tabular-nums font-bold">${h.valor_planilla?.toLocaleString("es-CO")}</td>
                      <td className="px-3 py-2">{h.fecha_pago || "—"}</td>
                      <td className="px-3 py-2 font-mono text-[11px]">{h.pdf_nombre || <span className="text-unal-red">Sin adjunto</span>}</td>
                      <td className="px-3 py-2">{h.alertas.length === 0 ? <Badge tone="success">Válido</Badge> : <div className="text-unal-red">{h.alertas.join("; ")}</div>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
