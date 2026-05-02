import { supabase } from "../config/supabaseClient.js";
import {
  normalizeActaPayload,
  validateActa,
  sameActaData,
} from "../utils/actaValidator.js";

function getCandidateVote(acta, candidato) {
  const found = acta.candidatos.find((item) => item.candidato === candidato);
  return found ? Number(found.votos || 0) : 0;
}

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function classifyObservationText(text) {
  const value = String(text || "").toLowerCase();

  if (!value.trim()) {
    return null;
  }

  if (value.includes("duplicado") || value.includes("cudriplicado")) {
    return {
      tipo: "OBS_DUPLICADO",
      motivo: "El acta contiene una observación relacionada con duplicidad.",
    };
  }

  if (value.includes("mesa que no existe") || value.includes("mesas que no existen")) {
    return {
      tipo: "OBS_MESA_NO_EXISTE",
      motivo: "El acta indica que la mesa no existe.",
    };
  }

  if (value.includes("nulos por blancos") || value.includes("nullos por blancos")) {
    return {
      tipo: "OBS_CAMBIO_NULOS_BLANCO",
      motivo: "El acta indica cambio entre votos nulos y blancos.",
    };
  }

  if (value.includes("datos borrados")) {
    return {
      tipo: "OBS_DATOS_BORRADOS",
      motivo: "El acta indica datos borrados.",
    };
  }

  if (value.includes("anulado")) {
    return {
      tipo: "OBS_ACTA_ANULADA",
      motivo: "El acta fue marcada como anulada.",
    };
  }

  if (value.includes("formulario") || value.includes("formularios no oficiales")) {
    return {
      tipo: "OBS_FORMULARIO_NO_OFICIAL",
      motivo: "El acta menciona uso de formularios no oficiales.",
    };
  }

  if (value.includes("mesa en lugar distinto")) {
    return {
      tipo: "OBS_MESA_EN_LUGAR_DISTINTO",
      motivo: "El acta indica funcionamiento de mesa en lugar distinto.",
    };
  }

  if (value.includes("fecha incorrecta")) {
    return {
      tipo: "OBS_FECHA_INCORRECTA",
      motivo: "El acta indica fecha incorrecta.",
    };
  }

  if (value.includes("firma") || value.includes("huella")) {
    return {
      tipo: "OBS_FALTA_FIRMAS_HUELLAS",
      motivo: "El acta indica falta de firmas o huellas.",
    };
  }

  if (value.includes("delegados")) {
    return {
      tipo: "OBS_AUSENCIA_DELEGADOS",
      motivo: "El acta indica ausencia o problema con delegados.",
    };
  }

  if (
    value.includes("jirado") ||
    value.includes("girado") ||
    value.includes("comprimido") ||
    value.includes("recortado") ||
    value.includes("aplanado")
  ) {
    return {
      tipo: "OBS_PROBLEMA_IMAGEN_OCR",
      motivo: "El acta indica problema físico, de escaneo u OCR.",
    };
  }

  return {
    tipo: "OBSERVACION_GENERAL",
    motivo: "El acta contiene una observación registrada en el archivo.",
  };
}

function detectHourObservation(acta) {
  const hourErrors = [];

  if (acta.apertura_hora !== null && Number(acta.apertura_hora) !== 8) {
    hourErrors.push(`Hora de apertura fuera de rango esperado: ${acta.apertura_hora}.`);
  }

  if (acta.cierre_hora !== null && Number(acta.cierre_hora) !== 16) {
    hourErrors.push(`Hora de cierre fuera de rango esperado: ${acta.cierre_hora}.`);
  }

  if (
    acta.apertura_minutos !== null &&
    (Number(acta.apertura_minutos) < 0 || Number(acta.apertura_minutos) > 59)
  ) {
    hourErrors.push(`Minutos de apertura inválidos: ${acta.apertura_minutos}.`);
  }

  if (
    acta.cierre_minutos !== null &&
    (Number(acta.cierre_minutos) < 0 || Number(acta.cierre_minutos) > 59)
  ) {
    hourErrors.push(`Minutos de cierre inválidos: ${acta.cierre_minutos}.`);
  }

  if (hourErrors.length === 0) {
    return null;
  }

  return {
    tipo: "OBS_HORARIO_FUERA_RANGO",
    motivo: hourErrors.join(" "),
  };
}

function detectObservation(acta) {
  const observations = [];

  if (hasText(acta.observaciones)) {
    observations.push(classifyObservationText(acta.observaciones));
  }

  const hourObservation = detectHourObservation(acta);

  if (hourObservation) {
    observations.push(hourObservation);
  }

  const validObservations = observations.filter(Boolean);

  if (validObservations.length === 0) {
    return {
      hasObservation: false,
      tipo: null,
      motivo: null,
    };
  }

  return {
    hasObservation: true,
    tipo: validObservations.map((item) => item.tipo).join(" | "),
    motivo: validObservations.map((item) => item.motivo).join(" | "),
  };
}

async function logInconsistencia({
  codigo_acta,
  tipo_error,
  detalle_error,
  datos_crudos,
}) {
  const { error } = await supabase.from("logs_inconsistencias").insert({
    codigo_acta,
    tipo_error,
    detalle_error,
    datos_crudos,
  });

  if (error) {
    console.error("Error guardando log:", error.message);
  }
}

async function saveEvent({
  entidad_id,
  tipo_evento,
  payload,
  usuario_sistema = "backend_api",
}) {
  const { error } = await supabase.from("event_store_oficial").insert({
    entidad_id,
    tipo_evento,
    payload,
    usuario_sistema,
  });

  if (error) {
    console.error("Error guardando evento:", error.message);
  }
}

async function getMesa(codigoActa) {
  const { data, error } = await supabase
    .from("mesas")
    .select("*")
    .eq("codigo_acta", codigoActa)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getExistingActa(codigoActa) {
  const { data, error } = await supabase
    .from("actas_oficiales")
    .select("*")
    .eq("codigo_acta", codigoActa)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getExistingVotes(codigoActa) {
  const { data, error } = await supabase
    .from("votos_candidatos_oficial")
    .select("*")
    .eq("codigo_acta", codigoActa);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function deleteOfficialActa(codigoActa) {
  const { error: deleteVotesError } = await supabase
    .from("votos_candidatos_oficial")
    .delete()
    .eq("codigo_acta", codigoActa);

  if (deleteVotesError) {
    throw new Error(deleteVotesError.message);
  }

  const { error: deleteActaError } = await supabase
    .from("actas_oficiales")
    .delete()
    .eq("codigo_acta", codigoActa);

  if (deleteActaError) {
    throw new Error(deleteActaError.message);
  }
}

async function saveObservedActa({
  acta,
  rawPayload,
  source,
  tipo_observacion,
  motivo_observacion,
  extra = {},
}) {
  const row = {
    codigo_acta: acta.codigo_acta,
    nro_mesa: acta.nro_mesa,
    votantes_habilitados: acta.votantes_habilitados_archivo,

    papeletas_anfora: acta.papeletas_anfora,
    papeletas_no_utilizadas: acta.papeletas_no_utilizadas,

    p1: getCandidateVote(acta, "P1"),
    p2: getCandidateVote(acta, "P2"),
    p3: getCandidateVote(acta, "P3"),
    p4: getCandidateVote(acta, "P4"),

    votos_validos: acta.votos_validos,
    votos_blancos: acta.votos_blancos,
    votos_nulos: acta.votos_nulos,

    apertura_hora: acta.apertura_hora,
    apertura_minutos: acta.apertura_minutos,
    cierre_hora: acta.cierre_hora,
    cierre_minutos: acta.cierre_minutos,

    observaciones: acta.observaciones,
    tipo_observacion,
    motivo_observacion,

    source,
    estado_observacion: "PENDIENTE_REVISION",

    datos_crudos: {
      rawPayload,
      extra,
    },
  };

  const { error } = await supabase
    .from("actas_observadas")
    .upsert(row, { onConflict: "codigo_acta" });

  if (error) {
    await logInconsistencia({
      codigo_acta: acta.codigo_acta || null,
      tipo_error: "ERROR_INSERTANDO_ACTA_OBSERVADA",
      detalle_error: error.message,
      datos_crudos: row,
    });

    throw new Error(error.message);
  }
}

async function markMesaEstado(codigoActa, estado) {
  const { error } = await supabase
    .from("mesas")
    .update({ estado_acta: estado })
    .eq("codigo_acta", codigoActa);

  if (error) {
    console.error("Error actualizando estado de mesa:", error.message);
  }
}

async function insertOfficialActa(acta, rawPayload) {
  const { error: insertActaError } = await supabase.from("actas_oficiales").insert({
    codigo_acta: acta.codigo_acta,
    papeletas_anfora: acta.papeletas_anfora,
    papeletas_no_utilizadas: acta.papeletas_no_utilizadas,
    votos_validos: acta.votos_validos,
    votos_blancos: acta.votos_blancos,
    votos_nulos: acta.votos_nulos,
    apertura_hora: acta.apertura_hora,
    apertura_minutos: acta.apertura_minutos,
    cierre_hora: acta.cierre_hora,
    cierre_minutos: acta.cierre_minutos,
    observaciones: acta.observaciones,
  });

  if (insertActaError) {
    await logInconsistencia({
      codigo_acta: acta.codigo_acta,
      tipo_error: "ERROR_INSERCION_ACTA",
      detalle_error: insertActaError.message,
      datos_crudos: rawPayload,
    });

    throw new Error(insertActaError.message);
  }

  const votosRows = acta.candidatos.map((candidate) => ({
    codigo_acta: acta.codigo_acta,
    candidato: candidate.candidato,
    votos: candidate.votos,
  }));

  const { error: insertVotesError } = await supabase
    .from("votos_candidatos_oficial")
    .insert(votosRows);

  if (insertVotesError) {
    await logInconsistencia({
      codigo_acta: acta.codigo_acta,
      tipo_error: "ERROR_INSERCION_VOTOS",
      detalle_error: insertVotesError.message,
      datos_crudos: rawPayload,
    });

    throw new Error(insertVotesError.message);
  }
}

export async function processOfficialActa(rawPayload, source = "API") {
  const acta = normalizeActaPayload(rawPayload);

  const mesa = await getMesa(acta.codigo_acta);
  const validationErrors = validateActa(acta, mesa);

  if (validationErrors.length > 0) {
    await markMesaEstado(acta.codigo_acta, "OBSERVADA");

    await saveObservedActa({
      acta,
      rawPayload,
      source,
      tipo_observacion: "ERROR_VALIDACION",
      motivo_observacion: validationErrors.join(" | "),
      extra: {
        validationErrors,
      },
    });

    await logInconsistencia({
      codigo_acta: acta.codigo_acta || null,
      tipo_error: "ERROR_VALIDACION",
      detalle_error: validationErrors.join(" | "),
      datos_crudos: rawPayload,
    });

    await saveEvent({
      entidad_id: acta.codigo_acta || null,
      tipo_evento: "ACTA_RECHAZADA_OBSERVADA",
      payload: {
        source,
        rawPayload,
        validationErrors,
      },
    });

    return {
      status: "RECHAZADA_OBSERVADA",
      codigo_acta: acta.codigo_acta || null,
      errors: validationErrors,
      message:
        "El acta fue rechazada por validación y guardada en actas_observadas.",
    };
  }

  const observationInfo = detectObservation(acta);
  const existingActa = await getExistingActa(acta.codigo_acta);

  if (existingActa) {
    const existingVotes = await getExistingVotes(acta.codigo_acta);
    const isSame = sameActaData(existingActa, acta, existingVotes);

    if (isSame && !observationInfo.hasObservation) {
      await logInconsistencia({
        codigo_acta: acta.codigo_acta,
        tipo_error: "DUPLICADO_IGUAL",
        detalle_error:
          "La misma acta ya existe con los mismos datos. No se insertó nuevamente.",
        datos_crudos: rawPayload,
      });

      await saveEvent({
        entidad_id: acta.codigo_acta,
        tipo_evento: "ACTA_DUPLICADA_IGUAL_IGNORADA",
        payload: {
          source,
          rawPayload,
        },
      });

      return {
        status: "DUPLICADO_IGNORADO",
        codigo_acta: acta.codigo_acta,
        message: "La acta ya existía con los mismos datos. No se duplicó.",
      };
    }

    if (isSame && observationInfo.hasObservation) {
      await deleteOfficialActa(acta.codigo_acta);
      await markMesaEstado(acta.codigo_acta, "OBSERVADA");

      await saveObservedActa({
        acta,
        rawPayload,
        source,
        tipo_observacion: observationInfo.tipo,
        motivo_observacion:
          "El acta tenía datos iguales, pero contiene observación. Se retiró de actas oficiales y pasó a observadas.",
        extra: {
          previousOfficialActa: existingActa,
          previousVotes: existingVotes,
          observationInfo,
        },
      });

      await logInconsistencia({
        codigo_acta: acta.codigo_acta,
        tipo_error: "ACTA_CON_OBSERVACION_MOVIDA_A_OBSERVADAS",
        detalle_error:
          "El acta tenía los mismos datos, pero contiene observación. Se borró de actas oficiales y se guardó en actas_observadas.",
        datos_crudos: {
          rawPayload,
          previousOfficialActa: existingActa,
          previousVotes: existingVotes,
        },
      });

      await saveEvent({
        entidad_id: acta.codigo_acta,
        tipo_evento: "ACTA_OFICIAL_MOVIDA_A_OBSERVADAS",
        payload: {
          source,
          rawPayload,
          previousOfficialActa: existingActa,
          previousVotes: existingVotes,
        },
      });

      return {
        status: "OBSERVADA_MOVIDA",
        codigo_acta: acta.codigo_acta,
        message:
          "El acta tenía observación. Se eliminó de actas oficiales y pasó a actas observadas.",
      };
    }

    await deleteOfficialActa(acta.codigo_acta);
    await markMesaEstado(acta.codigo_acta, "OBSERVADA");

    await saveObservedActa({
      acta,
      rawPayload,
      source,
      tipo_observacion: "DUPLICADO_DATOS_ALTERADOS_BORRADO_BDD",
      motivo_observacion:
        "El código de acta ya existía, pero los datos eran distintos. Se borró el registro anterior de la base oficial y se guardó en actas_observadas.",
      extra: {
        previousOfficialActa: existingActa,
        previousVotes: existingVotes,
        newPayload: rawPayload,
      },
    });

    await logInconsistencia({
      codigo_acta: acta.codigo_acta,
      tipo_error: "DUPLICADO_DATOS_ALTERADOS_BORRADO_BDD",
      detalle_error:
        "El código de acta se repitió con datos distintos. Se eliminaron los datos previos de actas_oficiales y votos_candidatos_oficial.",
      datos_crudos: {
        rawPayload,
        previousOfficialActa: existingActa,
        previousVotes: existingVotes,
      },
    });

    await saveEvent({
      entidad_id: acta.codigo_acta,
      tipo_evento: "DUPLICADO_DATOS_ALTERADOS_BORRADO_BDD",
      payload: {
        source,
        rawPayload,
        previousOfficialActa: existingActa,
        previousVotes: existingVotes,
      },
    });

    return {
      status: "DUPLICADO_DATOS_ALTERADOS_BORRADO_BDD",
      codigo_acta: acta.codigo_acta,
      message:
        "El acta estaba duplicada con datos alterados. Se borró de la base oficial y se guardó en actas observadas.",
    };
  }

  if (observationInfo.hasObservation) {
    await markMesaEstado(acta.codigo_acta, "OBSERVADA");

    await saveObservedActa({
      acta,
      rawPayload,
      source,
      tipo_observacion: observationInfo.tipo,
      motivo_observacion: observationInfo.motivo,
      extra: {
        observationInfo,
      },
    });

    await logInconsistencia({
      codigo_acta: acta.codigo_acta,
      tipo_error: observationInfo.tipo,
      detalle_error:
        "El acta contiene observaciones. No se insertó en actas_oficiales, se guardó en actas_observadas.",
      datos_crudos: rawPayload,
    });

    await saveEvent({
      entidad_id: acta.codigo_acta,
      tipo_evento: "ACTA_GUARDADA_COMO_OBSERVADA",
      payload: {
        source,
        rawPayload,
        observationInfo,
      },
    });

    return {
      status: "OBSERVADA",
      codigo_acta: acta.codigo_acta,
      message:
        "El acta contiene observaciones. No fue insertada como oficial y se guardó en actas_observadas.",
    };
  }

  await insertOfficialActa(acta, rawPayload);
  await markMesaEstado(acta.codigo_acta, "PROCESADA");

  await saveEvent({
    entidad_id: acta.codigo_acta,
    tipo_evento: "ACTA_OFICIAL_REGISTRADA",
    payload: {
      source,
      acta,
    },
  });

  return {
    status: "INSERTADA",
    codigo_acta: acta.codigo_acta,
    message: "Acta oficial registrada correctamente.",
  };
}

export async function processManyOfficialActas(rows, source = "CSV") {
  const results = [];

  for (const row of rows) {
    try {
      const result = await processOfficialActa(row, source);
      results.push(result);
    } catch (error) {
      const codigoActa =
        row.codigo_acta ??
        row.codigo_mesa ??
        row.CodigoActa ??
        row.CodigoMesa ??
        row.CODIGO_MESA ??
        row.MESA ??
        null;

      results.push({
        status: "ERROR",
        codigo_acta: codigoActa,
        error: error.message,
      });

      await logInconsistencia({
        codigo_acta: codigoActa,
        tipo_error: "ERROR_GENERAL",
        detalle_error: error.message,
        datos_crudos: row,
      });
    }
  }

  return results;
}