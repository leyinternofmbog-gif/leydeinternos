
const { verify, reply } = require('./_security');

// ==========================================
// CONEXIÓN CON REDCAP
// ==========================================

async function fetchRecords(token, proyecto = 'REDCap') {
  const apiUrl = process.env.REDCAP_API_URL;

  if (!token || !apiUrl) {
    throw new Error(
      `Falta configuración REDCap para ${proyecto}`
    );
  }

  const params = new URLSearchParams({
    token,
    content: 'record',
    format: 'json',
    type: 'flat',
    rawOrLabel: 'raw',
    exportCheckboxLabel: 'false'
  });

  const maxIntentos = 2;

  for (let intento = 1; intento <= maxIntentos; intento++) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 20000);

    try {
      console.log(
        `Consultando REDCap (${proyecto}), intento ${intento}`
      );

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString(),
        signal: controller.signal
      });

      if (!res.ok) {
        const contentType =
          res.headers.get('content-type') || '';

        console.error('REDCap rechazó la solicitud', {
          proyecto,
          status: res.status,
          contentType
        });

        throw new Error(
          `REDCap ${proyecto}: HTTP ${res.status}`
        );
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error(
          `Respuesta REDCap inesperada en ${proyecto}`
        );
      }

      console.log(
        `REDCap ${proyecto}: ${data.length} registros recibidos`
      );

      return data;

    } catch (error) {
      const codigo =
        error.cause?.code || error.code || '';

      console.error(`Error REDCap (${proyecto})`, {
        intento,
        message: error.message,
        cause: error.cause?.message,
        code: codigo
      });

      const esTransitorio =
        codigo === 'ECONNRESET' ||
        codigo === 'UND_ERR_CONNECT_TIMEOUT' ||
        error.name === 'AbortError';

      if (!esTransitorio || intento === maxIntentos) {
        throw error;
      }

      console.log(
        `Reintentando conexión REDCap (${proyecto})`
      );

      await new Promise(resolve =>
        setTimeout(resolve, 1000 * intento)
      );

    } finally {
      clearTimeout(timeout);
    }
  }
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

const clean = v =>
  Number(
    String(v || '').replace(/[^0-9]/g, '')
  ) || 0;

const month = v =>
  String(v || '').padStart(2, '0');

// Calcular meses entre fechas
function months(start, end) {
  if (!/^\d{4}-\d{2}/.test(start || '')) {
    return [];
  }

  const now = new Date();

  const limit =
    now.getUTCFullYear() * 12 +
    now.getUTCMonth();

  let a =
    Number(start.slice(0, 4)) * 12 +
    Number(start.slice(5, 7)) - 1;

  let b =
    /^\d{4}-\d{2}/.test(end || '')
      ? Number(end.slice(0, 4)) * 12 +
        Number(end.slice(5, 7)) - 1
      : limit;

  b = Math.min(b, limit);

  const out = [];

  while (a <= b && out.length < 240) {
    out.push(
      `${Math.floor(a / 12)}-${month(a % 12 + 1)}`
    );

    a++;
  }

  return out;
}

// Valores esperados por año
function values() {
  const map = {};

  for (
    const item of
    (process.env.VALOR_PLANILLA_POR_ANIO || '')
      .split('|')
  ) {
    const [y, v] = item.split(':');

    if (/^\d{4}$/.test(y || '') && v) {
      map[y] = clean(v);
    }
  }

  return map;
}

// ==========================================
// FUNCIÓN PRINCIPAL NETLIFY
// ==========================================

exports.handler = async (event) => {

  // Permitir únicamente GET
  if (event.httpMethod !== 'GET') {
    return reply(405, {
      error: 'Método no permitido'
    });
  }

  try {

    // ======================================
    // VALIDAR AUTENTICACIÓN
    // ======================================

    const auth =
      event.headers.authorization ||
      event.headers.Authorization ||
      '';

    const session = verify(
      auth.replace(/^Bearer\s+/i, '')
    );

    if (
      !session ||
      session.type !== 'session'
    ) {
      return reply(401, {
        error:
          'Inicia sesión para consultar el tablero'
      });
    }

    // ======================================
    // CONSULTAR PROYECTOS REDCAP
    // ======================================

    // Primero consultar Encuestas
    const encuestas = await fetchRecords(
      process.env.REDCAP_TOKEN_ENCUESTA,
      'Encuestas'
    );

    // Después consultar Base Maestra
    const maestra = await fetchRecords(
      process.env.REDCAP_TOKEN_MAESTRA,
      'Maestra'
    );

    console.log(
      'Consultas REDCap completadas'
    );

    // ======================================
    // AGRUPAR ENCUESTAS POR DOCUMENTO
    // ======================================

    const grouped = new Map();

    const ideal = values();

    for (const r of encuestas) {

      const doc = String(
        r.documento || ''
      ).trim();

      if (!doc) continue;

      const year = String(
        r.ano_cotizacion ||
        r.anio_reporte ||
        ''
      ).trim();

      const m = month(
        r.mes_cotizacion ||
        r.mes_reporte
      );

      const periodo =
        /^\d{4}$/.test(year) &&
        /^(0[1-9]|1[0-2])$/.test(m)
          ? `${year}-${m}`
          : '';

      const amount = clean(
        r.valor_planilla
      );

      const expected = ideal[year];

      const alerts = [];

      // PDF faltante
      if (!r.pdf_planilla) {
        alerts.push(
          'Sin PDF adjunto'
        );
      }

      // Valor diferente al esperado
      if (
        expected !== undefined &&
        amount !== expected
      ) {
        alerts.push(
          'Valor distinto al configurado'
        );
      }

      // No recibió giro
      if (
        String(r.giro_mes_anterior) === '0'
      ) {
        alerts.push(
          'Reporta no haber recibido giro'
        );
      }

      // Renuncia al estímulo
      if (
        String(r.renuncia_giro) === '1'
      ) {
        alerts.push(
          'Renuncia al estímulo'
        );
      }

      const record = {
        record_id: r.record_id,
        periodo,
        fecha_cargue: '',
        fecha_pago: r.fecha_pago || '',
        numero_planilla:
          String(r.numero_planilla || ''),
        valor_planilla: amount,
        valor_esperado: expected ?? null,
        valor_diferente:
          expected !== undefined &&
          amount !== expected,
        sin_giro:
          String(r.giro_mes_anterior) === '0',
        pdf_nombre: r.pdf_planilla
          ? 'Archivo adjunto en REDCap'
          : '',
        nombre_pdf_esperado: periodo
          ? `${periodo}-${doc}.pdf`
          : '',
        cumple_estandar_pdf: null,
        recomendacion_pdf: null,
        renuncio:
          String(r.renuncia_giro) === '1',
        alertas: alerts
      };

      if (!grouped.has(doc)) {
        grouped.set(doc, []);
      }

      grouped.get(doc).push(record);
    }

    // ======================================
    // CONSTRUIR INFORMACIÓN DE ESTUDIANTES
    // ======================================

    const estudiantes = maestra.map(e => {

      const doc = String(
        e.numero_identificacion || ''
      ).trim();

      const regs = grouped.get(doc) || [];

      const byMonth = new Map();

      const byNumber = new Map();

      // Identificar meses y planillas
      for (const r of regs) {

        if (r.periodo) {
          byMonth.set(
            r.periodo,
            (byMonth.get(r.periodo) || 0) + 1
          );
        }

        if (r.numero_planilla) {

          if (!byNumber.has(r.numero_planilla)) {
            byNumber.set(
              r.numero_planilla,
              new Set()
            );
          }

          byNumber
            .get(r.numero_planilla)
            .add(r.periodo);
        }
      }

      // Detectar duplicados
      for (const r of regs) {

        if (
          r.periodo &&
          (byMonth.get(r.periodo) || 0) > 1
        ) {
          r.alertas.push(
            'Múltiples cargues del mismo mes'
          );
        }

        if (
          r.numero_planilla &&
          (
            byNumber.get(
              r.numero_planilla
            )?.size || 0
          ) > 1
        ) {
          r.alertas.push(
            'N° planilla repetido en meses distintos'
          );
        }
      }

      // Nombre completo
      const name = [
        e.primer_nombre,
        e.segundo_nombre,
        e.primer_apellido,
        e.segundo_apellido
      ]
        .filter(Boolean)
        .join(' ');

      // Meses sin reporte
      const mesesFaltantes = months(
        e.fecha_inicio_practica,
        e.fecha_fin_practica
      ).filter(
        x => !byMonth.has(x)
      );

      return {
        documento: doc,
        nombre: name,
        ips:
          e.nombre_entidad_reporta || '',
        inicio_practica:
          e.fecha_inicio_practica || '',
        fin_practica:
          e.fecha_fin_practica || '',
        meses_faltantes:
          mesesFaltantes,
        meses_exentos: [],
        total_reportes:
          regs.length,
        historico: regs.sort(
          (a, b) =>
            b.periodo.localeCompare(a.periodo)
        )
      };
    });

    console.log(
      'Auditoría generada correctamente',
      {
        total_estudiantes:
          estudiantes.length,
        total_encuestas:
          encuestas.length
      }
    );

    // ======================================
    // RESPUESTA AL DASHBOARD
    // ======================================

    return reply(200, {
      estudiantes,
      avisos: [
        'Los meses faltantes son preliminares: no se dispone de un campo estructurado de meses exentos.',
        'Los nombres de los PDF no pueden validarse desde la exportación de registros de REDCap.'
      ]
    });

  } catch (e) {

    // ======================================
    // REGISTRO DETALLADO DE ERRORES
    // ======================================

    console.error('Audit error', {
      message: e.message,
      cause: e.cause?.message,
      code: e.cause?.code
    });

    return reply(500, {
      error:
        'No se pudo completar la consulta de auditoría'
    });
  }
};
