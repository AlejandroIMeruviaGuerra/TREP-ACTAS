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

function manualToInt(value, fieldName, errors) {
  if (value === undefined || value === null || value === "") {
    errors.push(`${fieldName} es obligatorio.`);
    return 0;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    errors.push(`${fieldName} debe ser numérico.`);
    return 0;
  }

  if (!Number.isInteger(numberValue)) {
    errors.push(`${fieldName} debe ser un número entero.`);
    return 0;
  }

  if (numberValue < 0) {
    errors.push(`${fieldName} no puede ser negativo.`);
    return 0;
  }

  return numberValue;
}

function isValidHour(hour, minute) {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

async function saveManualValidationLog(
  codigoActa,
  tipoError,
  detalle,
  datosCrudos
) {
  try {
    await supabase.from("logs_inconsistencias").insert({
      codigo_acta: codigoActa || null,
      tipo_error: tipoError,
      detalle_error: detalle,
      datos_crudos: datosCrudos,
    });
  } catch (error) {
    console.error("No se pudo guardar log manual:", error.message);
  }
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
  const usuarioRevision =
    req.body?.usuario_revision || req.body?.usuario || "frontend_admin";

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
        usuario_revision: usuarioRevision,
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
      usuario_sistema: usuarioRevision,
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
  const usuarioRevision =
    req.body?.usuario_revision || req.body?.usuario || "frontend_admin";

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
      usuario_revision: usuarioRevision,
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
    usuario_sistema: usuarioRevision,
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

    const votosPorCandidato = Object.entries(votosPorCandidatoMap)
      .map(([candidato, total]) => ({
        candidato,
        votos: total,
      }))
      .sort((a, b) => b.votos - a.votos);

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

export async function getOfficialCatalog(req, res) {
  try {
    const territorios = await fetchAllRows("territorios", "*", {
      orders: [
        { column: "departamento", ascending: true },
        { column: "provincia", ascending: true },
        { column: "municipio", ascending: true },
      ],
    });

    const recintos = await fetchAllRows("recintos", "*", {
      orders: [{ column: "nombre_recinto", ascending: true }],
    });

    const mesas = await fetchAllRows("mesas", "*", {
      orders: [
        { column: "codigo_recinto", ascending: true },
        { column: "nro_mesa", ascending: true },
      ],
    });

    const actasOficiales = await fetchAllRows(
      "actas_oficiales",
      "codigo_acta"
    );

    const territorioMap = new Map();
    const recintoMap = new Map();
    const actasSet = new Set();

    territorios.forEach((territorio) => {
      territorioMap.set(Number(territorio.codigo_territorial), territorio);
    });

    recintos.forEach((recinto) => {
      recintoMap.set(Number(recinto.codigo_recinto), recinto);
    });

    actasOficiales.forEach((acta) => {
      actasSet.add(Number(acta.codigo_acta));
    });

    const recintosDetalle = recintos.map((recinto) => {
      const territorio = territorioMap.get(Number(recinto.codigo_territorial));

      return {
        ...recinto,
        departamento: territorio?.departamento || "Sin departamento",
        provincia: territorio?.provincia || "Sin provincia",
        municipio: territorio?.municipio || "Sin municipio",
      };
    });

    const mesasDetalle = mesas.map((mesa) => {
      const recinto = recintoMap.get(Number(mesa.codigo_recinto));
      const territorio = recinto
        ? territorioMap.get(Number(recinto.codigo_territorial))
        : null;

      const tieneTranscripcion = actasSet.has(Number(mesa.codigo_acta));

      return {
        ...mesa,
        nombre_recinto: recinto?.nombre_recinto || "Sin recinto",
        direccion_recinto: recinto?.direccion || "Sin dirección",
        departamento: territorio?.departamento || "Sin departamento",
        provincia: territorio?.provincia || "Sin provincia",
        municipio: territorio?.municipio || "Sin municipio",
        tiene_transcripcion: tieneTranscripcion,
        estado_transcripcion: tieneTranscripcion
          ? "CON_TRANSCRIPCION"
          : "VACIA",
      };
    });

    return res.json({
      ok: true,
      data: {
        territorios,
        recintos: recintosDetalle,
        mesas: mesasDetalle,
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo catálogo oficial",
      error: error.message,
    });
  }
}

export async function createOfficialMesaAndActa(req, res) {
  const errors = [];

  const usuarioRevision =
    req.body?.usuario_revision ||
    req.body?.usuario ||
    req.headers["x-user-name"];

  if (!usuarioRevision || String(usuarioRevision).trim().length < 3) {
    errors.push("Debe existir un usuario activo para transcribir el acta.");
  }

  const codigoActa = manualToInt(
    req.body.codigo_acta,
    "Código de acta",
    errors
  );

  const p1 = manualToInt(req.body.p1, "Votos P1", errors);
  const p2 = manualToInt(req.body.p2, "Votos P2", errors);
  const p3 = manualToInt(req.body.p3, "Votos P3", errors);
  const p4 = manualToInt(req.body.p4, "Votos P4", errors);

  const votosBlancos = manualToInt(
    req.body.votos_blancos,
    "Votos blancos",
    errors
  );

  const votosNulos = manualToInt(
    req.body.votos_nulos,
    "Votos nulos",
    errors
  );

  const aperturaHora = manualToInt(
    req.body.apertura_hora,
    "Hora de apertura",
    errors
  );

  const aperturaMinutos = manualToInt(
    req.body.apertura_minutos,
    "Minutos de apertura",
    errors
  );

  const cierreHora = manualToInt(
    req.body.cierre_hora,
    "Hora de cierre",
    errors
  );

  const cierreMinutos = manualToInt(
    req.body.cierre_minutos,
    "Minutos de cierre",
    errors
  );

  if (codigoActa <= 0) {
    errors.push("El código de acta debe ser mayor a 0.");
  }

  if (errors.length > 0) {
    await saveManualValidationLog(
      codigoActa || null,
      "ERROR_TRANSCRIPCION_MANUAL",
      errors.join(" | "),
      req.body
    );

    return res.status(400).json({
      ok: false,
      message: "No se pudo transcribir el acta por errores de validación.",
      errors,
    });
  }

  const { data: mesa, error: mesaError } = await supabase
    .from("mesas")
    .select("*")
    .eq("codigo_acta", codigoActa)
    .maybeSingle();

  if (mesaError) {
    return res.status(500).json({
      ok: false,
      message: "Error buscando la mesa.",
      error: mesaError.message,
    });
  }

  if (!mesa) {
    await saveManualValidationLog(
      codigoActa,
      "MESA_NO_EXISTE",
      "No existe una mesa registrada con ese código de acta.",
      req.body
    );

    return res.status(404).json({
      ok: false,
      message:
        "No existe una mesa con ese código de acta. Primero debe existir en la tabla mesas.",
    });
  }

  const votantesHabilitados = Number(mesa.votantes_habilitados || 0);

  if (votantesHabilitados <= 0) {
    errors.push(
      "La mesa existe, pero no tiene votantes habilitados válidos. No se puede transcribir."
    );
  }

  const { data: actaExistente, error: actaExistenteError } = await supabase
    .from("actas_oficiales")
    .select("codigo_acta")
    .eq("codigo_acta", codigoActa)
    .maybeSingle();

  if (actaExistenteError) {
    return res.status(500).json({
      ok: false,
      message: "Error verificando si la mesa ya tiene transcripción.",
      error: actaExistenteError.message,
    });
  }

  if (actaExistente) {
    await saveManualValidationLog(
      codigoActa,
      "ACTA_YA_TRANSCRITA",
      "La mesa ya tiene una transcripción registrada en actas_oficiales.",
      req.body
    );

    return res.status(409).json({
      ok: false,
      message:
        "Esta mesa ya tiene una transcripción oficial. No se puede volver a insertar.",
    });
  }

  const votosValidos = p1 + p2 + p3 + p4;
  const papeletasAnfora = votosValidos + votosBlancos + votosNulos;
  const papeletasNoUtilizadas = votantesHabilitados - papeletasAnfora;

  if (papeletasAnfora > votantesHabilitados) {
    errors.push(
      `La suma de votos válidos + blancos + nulos no puede superar los votantes habilitados. Votantes: ${votantesHabilitados}, asignados: ${papeletasAnfora}.`
    );
  }

  if (papeletasNoUtilizadas < 0) {
    errors.push(
      "Las papeletas no utilizadas no pueden quedar en negativo. Revisa la distribución de votos."
    );
  }

  const camposLimitadosPorVotantes = [
    { nombre: "P1", valor: p1 },
    { nombre: "P2", valor: p2 },
    { nombre: "P3", valor: p3 },
    { nombre: "P4", valor: p4 },
    { nombre: "Votos blancos", valor: votosBlancos },
    { nombre: "Votos nulos", valor: votosNulos },
  ];

  for (const campo of camposLimitadosPorVotantes) {
    if (campo.valor > votantesHabilitados) {
      errors.push(
        `${campo.nombre} no puede ser mayor que votantes habilitados.`
      );
    }
  }

  if (!isValidHour(aperturaHora, aperturaMinutos)) {
    errors.push("La hora de apertura no es válida.");
  }

  if (!isValidHour(cierreHora, cierreMinutos)) {
    errors.push("La hora de cierre no es válida.");
  }

  const aperturaTotalMinutos = aperturaHora * 60 + aperturaMinutos;
  const cierreTotalMinutos = cierreHora * 60 + cierreMinutos;

  if (
    isValidHour(aperturaHora, aperturaMinutos) &&
    isValidHour(cierreHora, cierreMinutos) &&
    cierreTotalMinutos <= aperturaTotalMinutos
  ) {
    errors.push("La hora de cierre debe ser posterior a la hora de apertura.");
  }

  if (errors.length > 0) {
    await saveManualValidationLog(
      codigoActa,
      "ERROR_TRANSCRIPCION_MANUAL",
      errors.join(" | "),
      req.body
    );

    return res.status(400).json({
      ok: false,
      message: "No se pudo transcribir el acta por errores de validación.",
      errors,
    });
  }

  const { data: recinto, error: recintoError } = await supabase
    .from("recintos")
    .select("*")
    .eq("codigo_recinto", mesa.codigo_recinto)
    .maybeSingle();

  if (recintoError) {
    return res.status(500).json({
      ok: false,
      message: "Error buscando el recinto de la mesa.",
      error: recintoError.message,
    });
  }

  const { data: territorio, error: territorioError } = await supabase
    .from("territorios")
    .select("*")
    .eq("codigo_territorial", recinto?.codigo_territorial)
    .maybeSingle();

  if (territorioError) {
    return res.status(500).json({
      ok: false,
      message: "Error buscando el territorio del recinto.",
      error: territorioError.message,
    });
  }

  let createdActa = false;
  let createdVotos = false;
  const estadoAnteriorMesa = mesa.estado_acta || "PENDIENTE";

  try {
    const { error: insertActaError } = await supabase
      .from("actas_oficiales")
      .insert({
        codigo_acta: codigoActa,
        papeletas_anfora: papeletasAnfora,
        papeletas_no_utilizadas: papeletasNoUtilizadas,
        votos_validos: votosValidos,
        votos_blancos: votosBlancos,
        votos_nulos: votosNulos,
        apertura_hora: aperturaHora,
        apertura_minutos: aperturaMinutos,
        cierre_hora: cierreHora,
        cierre_minutos: cierreMinutos,
        observaciones: req.body.observaciones || null,
      });

    if (insertActaError) {
      throw new Error(insertActaError.message);
    }

    createdActa = true;

    const votosRows = [
      {
        codigo_acta: codigoActa,
        candidato: "P1",
        votos: p1,
      },
      {
        codigo_acta: codigoActa,
        candidato: "P2",
        votos: p2,
      },
      {
        codigo_acta: codigoActa,
        candidato: "P3",
        votos: p3,
      },
      {
        codigo_acta: codigoActa,
        candidato: "P4",
        votos: p4,
      },
    ];

    const { error: insertVotosError } = await supabase
      .from("votos_candidatos_oficial")
      .insert(votosRows);

    if (insertVotosError) {
      throw new Error(insertVotosError.message);
    }

    createdVotos = true;

    const { error: updateMesaError } = await supabase
      .from("mesas")
      .update({
        estado_acta: "PROCESADA",
      })
      .eq("codigo_acta", codigoActa);

    if (updateMesaError) {
      throw new Error(updateMesaError.message);
    }

    await supabase.from("event_store_oficial").insert({
      entidad_id: codigoActa,
      tipo_evento: "ACTA_TRANSCRITA_MANUALMENTE",
      payload: {
        codigo_acta: codigoActa,
        codigo_recinto: mesa.codigo_recinto,
        nro_mesa: mesa.nro_mesa,
        votantes_habilitados: votantesHabilitados,
        votos_validos: votosValidos,
        votos_blancos: votosBlancos,
        votos_nulos: votosNulos,
        papeletas_anfora: papeletasAnfora,
        papeletas_no_utilizadas: papeletasNoUtilizadas,
        departamento: territorio?.departamento || null,
        provincia: territorio?.provincia || null,
        municipio: territorio?.municipio || null,
        recinto: recinto?.nombre_recinto || null,
        usuario_revision: usuarioRevision,
      },
      usuario_sistema: usuarioRevision,
    });

    return res.status(201).json({
      ok: true,
      message: "Transcripción registrada correctamente en la mesa existente.",
      data: {
        codigo_acta: codigoActa,
        codigo_recinto: mesa.codigo_recinto,
        nro_mesa: mesa.nro_mesa,
        votantes_habilitados: votantesHabilitados,
        votos_validos: votosValidos,
        votos_blancos: votosBlancos,
        votos_nulos: votosNulos,
        papeletas_anfora: papeletasAnfora,
        papeletas_no_utilizadas: papeletasNoUtilizadas,
        departamento: territorio?.departamento || null,
        provincia: territorio?.provincia || null,
        municipio: territorio?.municipio || null,
        recinto: recinto?.nombre_recinto || null,
      },
    });
  } catch (error) {
    if (createdVotos) {
      await supabase
        .from("votos_candidatos_oficial")
        .delete()
        .eq("codigo_acta", codigoActa);
    }

    if (createdActa) {
      await supabase
        .from("actas_oficiales")
        .delete()
        .eq("codigo_acta", codigoActa);
    }

    await supabase
      .from("mesas")
      .update({
        estado_acta: estadoAnteriorMesa,
      })
      .eq("codigo_acta", codigoActa);

    await saveManualValidationLog(
      codigoActa,
      "ERROR_INSERCION_TRANSCRIPCION",
      error.message,
      req.body
    );

    return res.status(500).json({
      ok: false,
      message: "Error registrando la transcripción del acta.",
      error: error.message,
    });
  }
}