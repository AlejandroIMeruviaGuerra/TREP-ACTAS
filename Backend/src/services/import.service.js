import { supabase } from "../config/supabaseClient.js";

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const cleaned = String(value)
    .trim()
    .replace(",", ".")
    .replace(/\s/g, "");

  const number = Number(cleaned);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

function toBigIntNumber(value) {
  const number = toNumber(value);

  if (number === null) {
    return null;
  }

  return Math.trunc(number);
}

function buildCodigoActa(codigoRecinto, nroMesa) {
  const recinto = String(codigoRecinto).trim();
  const mesa = String(nroMesa).trim().padStart(3, "0");

  return Number(`${recinto}${mesa}`);
}

async function logImportError({ tipo_error, detalle_error, datos_crudos }) {
  const { error } = await supabase.from("logs_inconsistencias").insert({
    codigo_acta: null,
    tipo_error,
    detalle_error,
    datos_crudos,
  });

  if (error) {
    console.error("No se pudo guardar log de importación:", error.message);
  }
}

export async function upsertTerritorio(raw) {
  const codigoTerritorial = toNumber(
    firstValue(
      raw.codigo_territorial,
      raw.CodigoTerritorial,
      raw.CODIGO_TERRITORIAL
    )
  );

  const departamento = firstValue(raw.departamento, raw.Departamento);
  const provincia = firstValue(raw.provincia, raw.Provincia);
  const municipio = firstValue(raw.municipio, raw.Municipio);

  if (!codigoTerritorial || !departamento || !provincia || !municipio) {
    await logImportError({
      tipo_error: "TERRITORIO_INVALIDO",
      detalle_error:
        "Faltan datos obligatorios: CodigoTerritorial, Departamento, Provincia o Municipio.",
      datos_crudos: raw,
    });

    throw new Error(
      "Territorio inválido. Revisa CodigoTerritorial, Departamento, Provincia y Municipio."
    );
  }

  const row = {
    codigo_territorial: codigoTerritorial,
    departamento,
    provincia,
    municipio,
  };

  const { error } = await supabase
    .from("territorios")
    .upsert(row, { onConflict: "codigo_territorial" });

  if (error) {
    await logImportError({
      tipo_error: "ERROR_UPSERT_TERRITORIO",
      detalle_error: error.message,
      datos_crudos: raw,
    });

    throw new Error(error.message);
  }

  return {
    status: "TERRITORIO_IMPORTADO",
    codigo_territorial: codigoTerritorial,
  };
}

export async function upsertRecinto(raw) {
  const codigoTerritorial = toNumber(
    firstValue(
      raw.codigo_territorial,
      raw.CodigoTerritorial,
      raw.CODIGO_TERRITORIAL
    )
  );

  const codigoRecinto = toBigIntNumber(
    firstValue(raw.codigo_recinto, raw.CodigoRecinto, raw.CODIGO_RECINTO)
  );

  const nombreRecinto = firstValue(
    raw.nombre_recinto,
    raw.RecintoNombre,
    raw.Recinto,
    raw.RECINTO_NOMBRE
  );

  const direccion = firstValue(
    raw.direccion,
    raw.RecintoDireccion,
    raw.Direccion,
    raw.RECINTO_DIRECCION
  );

  const numMesas = toNumber(firstValue(raw.num_mesas, raw.NumMesas, raw.Mesas));

  if (!codigoTerritorial || !codigoRecinto || !nombreRecinto || !numMesas) {
    await logImportError({
      tipo_error: "RECINTO_INVALIDO",
      detalle_error:
        "Faltan datos obligatorios: CodigoTerritorial, CodigoRecinto, RecintoNombre o NumMesas.",
      datos_crudos: raw,
    });

    throw new Error(
      "Recinto inválido. Revisa CodigoTerritorial, CodigoRecinto, RecintoNombre y NumMesas."
    );
  }

  const { data: territorio, error: territorioError } = await supabase
    .from("territorios")
    .select("codigo_territorial")
    .eq("codigo_territorial", codigoTerritorial)
    .maybeSingle();

  if (territorioError) {
    throw new Error(territorioError.message);
  }

  if (!territorio) {
    await logImportError({
      tipo_error: "RECINTO_SIN_TERRITORIO",
      detalle_error: `El territorio ${codigoTerritorial} no existe.`,
      datos_crudos: raw,
    });

    throw new Error(`El territorio ${codigoTerritorial} no existe.`);
  }

  const row = {
    codigo_recinto: codigoRecinto,
    codigo_territorial: codigoTerritorial,
    nombre_recinto: nombreRecinto,
    direccion,
    num_mesas: numMesas,
  };

  const { error } = await supabase
    .from("recintos")
    .upsert(row, { onConflict: "codigo_recinto" });

  if (error) {
    await logImportError({
      tipo_error: "ERROR_UPSERT_RECINTO",
      detalle_error: error.message,
      datos_crudos: raw,
    });

    throw new Error(error.message);
  }

  return {
    status: "RECINTO_IMPORTADO",
    codigo_recinto: codigoRecinto,
  };
}

export async function upsertMesa(raw) {
  const codigoRecinto = toBigIntNumber(
    firstValue(raw.codigo_recinto, raw.CodigoRecinto, raw.CODIGO_RECINTO)
  );

  const nroMesa = toNumber(firstValue(raw.nro_mesa, raw.NroMesa, raw.Mesa));

  const votantesHabilitados = toNumber(
    firstValue(
      raw.votantes_habilitados,
      raw.VotantesHabilitados,
      raw.NroVotantes
    )
  );

  let codigoActa = toBigIntNumber(
    firstValue(raw.codigo_acta, raw.CodigoActa, raw.CODIGO_ACTA)
  );

  if (!codigoRecinto || !nroMesa || !votantesHabilitados) {
    await logImportError({
      tipo_error: "MESA_INVALIDA",
      detalle_error:
        "Faltan datos obligatorios: CodigoRecinto, NroMesa o VotantesHabilitados.",
      datos_crudos: raw,
    });

    throw new Error(
      "Mesa inválida. Revisa CodigoRecinto, NroMesa y VotantesHabilitados."
    );
  }

  /*
    Importante:
    Si Excel muestra CodigoActa como 1,0102E+12,
    puede perder precisión o quedar mal exportado.
    Por eso reconstruimos el CodigoActa desde:
    CodigoRecinto + NroMesa con 3 dígitos.
    Ejemplo:
    1010200001 + mesa 1 = 1010200001001
  */
  codigoActa = buildCodigoActa(codigoRecinto, nroMesa);

  const { data: recinto, error: recintoError } = await supabase
    .from("recintos")
    .select("codigo_recinto")
    .eq("codigo_recinto", codigoRecinto)
    .maybeSingle();

  if (recintoError) {
    throw new Error(recintoError.message);
  }

  if (!recinto) {
    await logImportError({
      tipo_error: "MESA_SIN_RECINTO",
      detalle_error: `El recinto ${codigoRecinto} no existe.`,
      datos_crudos: raw,
    });

    throw new Error(`El recinto ${codigoRecinto} no existe.`);
  }

  const row = {
    codigo_acta: codigoActa,
    codigo_recinto: codigoRecinto,
    nro_mesa: nroMesa,
    votantes_habilitados: votantesHabilitados,
    estado_acta: "PENDIENTE",
  };

  const { error } = await supabase
    .from("mesas")
    .upsert(row, { onConflict: "codigo_acta" });

  if (error) {
    await logImportError({
      tipo_error: "ERROR_UPSERT_MESA",
      detalle_error: error.message,
      datos_crudos: raw,
    });

    throw new Error(error.message);
  }

  return {
    status: "MESA_IMPORTADA",
    codigo_acta: codigoActa,
    codigo_recinto: codigoRecinto,
    nro_mesa: nroMesa,
  };
}