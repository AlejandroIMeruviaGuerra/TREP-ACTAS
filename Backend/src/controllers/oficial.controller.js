import { supabase } from "../config/supabaseClient.js";
import { processOfficialActa } from "../services/oficial.service.js";

async function fetchAllRows(tableName, selectQuery = "*", options = {}) {
  const pageSize = options.pageSize || 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    let query = supabase.from(tableName).select(selectQuery);

    if (Array.isArray(options.filters)) {
      for (const filter of options.filters) {
        if (filter.operator === "eq") {
          query = query.eq(filter.column, filter.value);
        }

        if (filter.operator === "neq") {
          query = query.neq(filter.column, filter.value);
        }

        if (filter.operator === "ilike") {
          query = query.ilike(filter.column, filter.value);
        }
      }
    }

    if (Array.isArray(options.orders)) {
      for (const orderItem of options.orders) {
        query = query.order(orderItem.column, {
          ascending: orderItem.ascending ?? true,
        });
      }
    }

    query = query.range(from, from + pageSize - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    allRows = allRows.concat(data || []);

    if (!data || data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}

function parseCsvBuffer(buffer) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  const firstLine = lines[0];

  let delimiter = ",";
  if (firstLine.includes(";")) delimiter = ";";
  if (firstLine.includes("\t")) delimiter = "\t";

  const headers = firstLine.split(delimiter).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((value) => value.trim());
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function sumNumbers(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

export async function insertOfficialActa(req, res) {
  try {
    const result = await processOfficialActa(req.body, "API_MANUAL");

    return res.json({
      ok: true,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error procesando acta oficial",
      error: error.message,
    });
  }
}

export async function receiveN8nActa(req, res) {
  try {
    const result = await processOfficialActa(req.body, "SELENIUM_EXCEL");

    return res.json({
      ok: true,
      result,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error procesando acta desde automatización",
      error: error.message,
    });
  }
}

export async function uploadOfficialCsv(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "No se recibió archivo CSV",
      });
    }

    const rows = parseCsvBuffer(req.file.buffer);
    const results = [];

    for (const row of rows) {
      try {
        const result = await processOfficialActa(row, "CSV_UPLOAD");
        results.push(result);
      } catch (error) {
        results.push({
          status: "ERROR",
          error: error.message,
          row,
        });
      }
    }

    return res.json({
      ok: true,
      total: rows.length,
      results,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error procesando CSV",
      error: error.message,
    });
  }
}

export async function getOfficialActas(req, res) {
  try {
    const data = await fetchAllRows("actas_oficiales", "*", {
      orders: [
        {
          column: "fecha_procesamiento",
          ascending: false,
        },
      ],
    });

    return res.json({
      ok: true,
      data,
      total: data.length,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo actas oficiales",
      error: error.message,
    });
  }
}

export async function getOfficialActasDetalle(req, res) {
  try {
    const data = await fetchAllRows("v_actas_oficiales_detalle", "*", {
      orders: [
        {
          column: "departamento",
          ascending: true,
        },
        {
          column: "provincia",
          ascending: true,
        },
        {
          column: "municipio",
          ascending: true,
        },
        {
          column: "nombre_recinto",
          ascending: true,
        },
        {
          column: "nro_mesa",
          ascending: true,
        },
      ],
    });

    return res.json({
      ok: true,
      data,
      total: data.length,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo actas oficiales con detalle",
      error: error.message,
    });
  }
}

export async function getObservedActas(req, res) {
  try {
    const data = await fetchAllRows("actas_observadas", "*", {
      orders: [
        {
          column: "fecha_registro",
          ascending: false,
        },
      ],
    });

    return res.json({
      ok: true,
      data,
      total: data.length,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo actas observadas",
      error: error.message,
    });
  }
}

export async function getObservedActasDetalle(req, res) {
  try {
    const estado = req.query.estado || "PENDIENTE_REVISION";

    const filters = [];

    if (estado !== "TODAS") {
      filters.push({
        operator: "eq",
        column: "estado_observacion",
        value: estado,
      });
    }

    const data = await fetchAllRows("v_actas_observadas_detalle", "*", {
      filters,
      orders: [
        {
          column: "fecha_registro",
          ascending: false,
        },
      ],
    });

    return res.json({
      ok: true,
      data,
      total: data.length,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo actas observadas con detalle",
      error: error.message,
    });
  }
}

export async function approveObservedActa(req, res) {
  const { codigoActa } = req.params;

  const { data: observada, error: observedError } = await supabase
    .from("actas_observadas")
    .select("*")
    .eq("codigo_acta", Number(codigoActa))
    .maybeSingle();

  if (observedError) {
    return res.status(500).json({
      ok: false,
      message: "Error buscando acta observada",
      error: observedError.message,
    });
  }

  if (!observada) {
    return res.status(404).json({
      ok: false,
      message: "No se encontró el acta observada",
    });
  }

  try {
    const { error: deleteVotesError } = await supabase
      .from("votos_candidatos_oficial")
      .delete()
      .eq("codigo_acta", observada.codigo_acta);

    if (deleteVotesError) {
      throw new Error(deleteVotesError.message);
    }

    const { error: deleteActaError } = await supabase
      .from("actas_oficiales")
      .delete()
      .eq("codigo_acta", observada.codigo_acta);

    if (deleteActaError) {
      throw new Error(deleteActaError.message);
    }

    const { error: insertActaError } = await supabase
      .from("actas_oficiales")
      .insert({
        codigo_acta: observada.codigo_acta,
        papeletas_anfora: observada.papeletas_anfora,
        papeletas_no_utilizadas: observada.papeletas_no_utilizadas,
        votos_validos: observada.votos_validos,
        votos_blancos: observada.votos_blancos,
        votos_nulos: observada.votos_nulos,
        apertura_hora: observada.apertura_hora,
        apertura_minutos: observada.apertura_minutos,
        cierre_hora: observada.cierre_hora,
        cierre_minutos: observada.cierre_minutos,
        observaciones: observada.observaciones,
      });

    if (insertActaError) {
      throw new Error(insertActaError.message);
    }

    const votosRows = [
      {
        codigo_acta: observada.codigo_acta,
        candidato: "P1",
        votos: observada.p1 || 0,
      },
      {
        codigo_acta: observada.codigo_acta,
        candidato: "P2",
        votos: observada.p2 || 0,
      },
      {
        codigo_acta: observada.codigo_acta,
        candidato: "P3",
        votos: observada.p3 || 0,
      },
      {
        codigo_acta: observada.codigo_acta,
        candidato: "P4",
        votos: observada.p4 || 0,
      },
    ];

    const { error: votosError } = await supabase
      .from("votos_candidatos_oficial")
      .insert(votosRows);

    if (votosError) {
      throw new Error(votosError.message);
    }

    const { error: updateObservedError } = await supabase
      .from("actas_observadas")
      .update({
        estado_observacion: "APROBADA",
        fecha_revision: new Date().toISOString(),
        usuario_revision: "frontend_admin",
        comentario_revision:
          req.body?.comentario || "Acta aprobada desde frontend",
      })
      .eq("codigo_acta", observada.codigo_acta);

    if (updateObservedError) {
      throw new Error(updateObservedError.message);
    }

    await supabase
      .from("mesas")
      .update({
        estado_acta: "PROCESADA",
      })
      .eq("codigo_acta", observada.codigo_acta);

    await supabase.from("event_store_oficial").insert({
      entidad_id: observada.codigo_acta,
      tipo_evento: "ACTA_OBSERVADA_APROBADA",
      payload: {
        codigo_acta: observada.codigo_acta,
        comentario: req.body?.comentario || null,
      },
      usuario_sistema: "frontend_admin",
    });

    return res.json({
      ok: true,
      message: "Acta observada aprobada y movida a actas oficiales",
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error aprobando acta observada",
      error: error.message,
    });
  }
}

export async function rejectObservedActa(req, res) {
  const { codigoActa } = req.params;

  const { data: observada, error: observedError } = await supabase
    .from("actas_observadas")
    .select("*")
    .eq("codigo_acta", Number(codigoActa))
    .maybeSingle();

  if (observedError) {
    return res.status(500).json({
      ok: false,
      message: "Error buscando acta observada",
      error: observedError.message,
    });
  }

  if (!observada) {
    return res.status(404).json({
      ok: false,
      message: "No se encontró el acta observada",
    });
  }

  const { error } = await supabase
    .from("actas_observadas")
    .update({
      estado_observacion: "RECHAZADA",
      fecha_revision: new Date().toISOString(),
      usuario_revision: "frontend_admin",
      comentario_revision:
        req.body?.comentario || "Acta rechazada desde frontend",
    })
    .eq("codigo_acta", Number(codigoActa));

  if (error) {
    return res.status(500).json({
      ok: false,
      message: "Error rechazando acta observada",
      error: error.message,
    });
  }

  await supabase
    .from("mesas")
    .update({
      estado_acta: "OBSERVADA_RECHAZADA",
    })
    .eq("codigo_acta", Number(codigoActa));

  await supabase.from("event_store_oficial").insert({
    entidad_id: Number(codigoActa),
    tipo_evento: "ACTA_OBSERVADA_RECHAZADA",
    payload: {
      codigo_acta: Number(codigoActa),
      comentario: req.body?.comentario || null,
    },
    usuario_sistema: "frontend_admin",
  });

  return res.json({
    ok: true,
    message: "Acta observada rechazada correctamente",
  });
}

export async function getOfficialSummary(req, res) {
  try {
    const actas = await fetchAllRows("actas_oficiales");
    const votos = await fetchAllRows("votos_candidatos_oficial");
    const mesas = await fetchAllRows("mesas");

    const votosPorCandidatoMap = {};

    for (const voto of votos || []) {
      const candidato = voto.candidato || "SIN_CANDIDATO";

      if (!votosPorCandidatoMap[candidato]) {
        votosPorCandidatoMap[candidato] = 0;
      }

      votosPorCandidatoMap[candidato] += Number(voto.votos || 0);
    }

    const votosPorCandidato = Object.entries(votosPorCandidatoMap).map(
      ([candidato, total]) => ({
        candidato,
        votos: total,
      })
    );

    const mesasPendientes = (mesas || []).filter(
      (mesa) => mesa.estado_acta === "PENDIENTE"
    ).length;

    const mesasProcesadas = (mesas || []).filter(
      (mesa) => mesa.estado_acta === "PROCESADA"
    ).length;

    const mesasObservadas = (mesas || []).filter((mesa) =>
      String(mesa.estado_acta || "").includes("OBSERVADA")
    ).length;

    const votosValidos = sumNumbers(actas || [], "votos_validos");
    const votosBlancos = sumNumbers(actas || [], "votos_blancos");
    const votosNulos = sumNumbers(actas || [], "votos_nulos");

    return res.json({
      ok: true,
      data: {
        actas_procesadas: (actas || []).length,
        mesas_pendientes: mesasPendientes,
        mesas_procesadas: mesasProcesadas,
        mesas_observadas: mesasObservadas,
        votos_por_candidato: votosPorCandidato,
        votos_validos: votosValidos,
        votos_blancos: votosBlancos,
        votos_nulos: votosNulos,
        total_general: votosValidos + votosBlancos + votosNulos,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo resumen oficial",
      error: error.message,
    });
  }
}

export async function getOfficialLogs(req, res) {
  try {
    const data = await fetchAllRows("logs_inconsistencias", "*", {
      orders: [
        {
          column: "fecha_registro",
          ascending: false,
        },
      ],
    });

    return res.json({
      ok: true,
      data,
      total: data.length,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo logs",
      error: error.message,
    });
  }
}

export async function getOfficialEvents(req, res) {
  try {
    const data = await fetchAllRows("event_store_oficial", "*", {
      orders: [
        {
          column: "fecha_evento",
          ascending: false,
        },
      ],
    });

    return res.json({
      ok: true,
      data,
      total: data.length,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo eventos",
      error: error.message,
    });
  }
}