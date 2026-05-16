import { getMongoDb } from "../config/mongoClient.js";
import { validarYGuardarActaMongo } from "../services/actaValidation.service.js";
import { procesarImagenOCR } from "../services/ocr.service.js";

function getDb(req) {
  if (req?.app?.locals?.db) {
    return req.app.locals.db;
  }

  return getMongoDb();
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeMongoId(item) {
  if (!item) return item;

  return {
    ...item,
    id: item._id?.toString?.() || item.id,
  };
}

async function safeCount(db, collectionName, filter = {}) {
  try {
    return await db.collection(collectionName).countDocuments(filter);
  } catch (error) {
    console.error(`Error contando ${collectionName}:`, error.message);
    return 0;
  }
}

async function safeFind(
  db,
  collectionName,
  sort = { fecha_registro: -1 },
  limit = 100,
  filter = {}
) {
  try {
    const data = await db
      .collection(collectionName)
      .find(filter)
      .sort(sort)
      .limit(limit)
      .toArray();

    return data.map(normalizeMongoId);
  } catch (error) {
    console.error(`Error buscando ${collectionName}:`, error.message);
    return [];
  }
}

function getSmsProcesadosFilter() {
  return {
    $and: [
      {
        estado: {
          $exists: true,
          $ne: null,
        },
      },
      {
        estado: {
          $not: /error/i,
        },
      },
      {
        estado: {
          $regex: "(proces|valid|ok|insert|acept)",
          $options: "i",
        },
      },
    ],
  };
}

function getSmsErrorFilter() {
  return {
    estado: {
      $regex: "error",
      $options: "i",
    },
  };
}

function getVotosActa(acta) {
  return {
    P1: toNumber(acta.P1 ?? acta.p1 ?? acta.candidato_1 ?? acta.candidato1),
    P2: toNumber(acta.P2 ?? acta.p2 ?? acta.candidato_2 ?? acta.candidato2),
    P3: toNumber(acta.P3 ?? acta.p3 ?? acta.candidato_3 ?? acta.candidato3),
    P4: toNumber(acta.P4 ?? acta.p4 ?? acta.candidato_4 ?? acta.candidato4),
  };
}

function calcularVotosPorCandidato(actas = []) {
  const votosPorCandidato = {
    P1: 0,
    P2: 0,
    P3: 0,
    P4: 0,
  };

  actas.forEach((acta) => {
    const votos = getVotosActa(acta);

    votosPorCandidato.P1 += votos.P1;
    votosPorCandidato.P2 += votos.P2;
    votosPorCandidato.P3 += votos.P3;
    votosPorCandidato.P4 += votos.P4;
  });

  return votosPorCandidato;
}

function calcularTotalVotos(votosPorCandidato) {
  return Object.values(votosPorCandidato).reduce(
    (total, votos) => total + toNumber(votos),
    0
  );
}

function calcularGanador(votosPorCandidato) {
  const ranking = Object.entries(votosPorCandidato)
    .map(([candidato, votos]) => ({
      candidato,
      votos: toNumber(votos),
    }))
    .sort((a, b) => b.votos - a.votos);

  if (!ranking.length || ranking[0].votos <= 0) {
    return null;
  }

  return ranking[0];
}

// =========================================================
// RECEPCIÓN DE ACTA MÓVIL FOTO/PDF
// =========================================================
export const uploadActaMobile = async (req, res) => {
  try {
    const file = req.file;
    const { usuario } = req.body;

    if (!file) {
      return res.status(400).json({
        ok: false,
        message: "No se recibió ningún archivo PDF o imagen.",
      });
    }

    console.log(`Iniciando procesamiento de: ${file.originalname}`);

    // Ejecuta el OCR enviando el buffer temporal desde la RAM
    const datosExtraidos = await procesarImagenOCR(
      file.buffer,
      file.originalname
    );

    console.log("Datos extraídos crudos por OCR:", datosExtraidos);

    // =========================================================
    // 🔄 AÑADIDO: ADAPTADOR DE ESTRUCTURA NINJA
    // Mapea el formato JSON anidado de Python al formato plano de tu controlador
    // =========================================================
    if (datosExtraidos && datosExtraidos.votos && datosExtraidos.totales) {
      datosExtraidos.P1 = datosExtraidos.votos.P1;
      datosExtraidos.P2 = datosExtraidos.votos.P2;
      datosExtraidos.P3 = datosExtraidos.votos.P3;
      datosExtraidos.P4 = datosExtraidos.votos.P4;
      datosExtraidos.votos_validos = datosExtraidos.totales.validos;
      datosExtraidos.votos_blancos = datosExtraidos.totales.blancos;
      datosExtraidos.votos_nulos = datosExtraidos.totales.nulos;
    }
    // =========================================================

    const votosValidos =
      toNumber(datosExtraidos.votos_validos) ||
      toNumber(datosExtraidos.P1) +
        toNumber(datosExtraidos.P2) +
        toNumber(datosExtraidos.P3) +
        toNumber(datosExtraidos.P4) ||
      toNumber(datosExtraidos.p1) +
        toNumber(datosExtraidos.p2) +
        toNumber(datosExtraidos.p3) +
        toNumber(datosExtraidos.p4);

    const votosBlancos = toNumber(datosExtraidos.votos_blancos);
    const votosNulos = toNumber(datosExtraidos.votos_nulos);
    const papeletasAnfora = votosValidos + votosBlancos + votosNulos;

    const papeletasNoUtilizadas =
      datosExtraidos.papeletas_no_utilizadas !== undefined
        ? toNumber(datosExtraidos.papeletas_no_utilizadas)
        : 62;

    const votantesHabilitados =
      datosExtraidos.votantes_habilitados !== undefined
        ? toNumber(datosExtraidos.votantes_habilitados)
        : papeletasAnfora + papeletasNoUtilizadas;

    const codigoActa =
      datosExtraidos.codigo_acta ??
      datosExtraidos.codigo_mesa ??
      datosExtraidos.codigoMesa;

    const actaCompletaParaValidar = {
      ...datosExtraidos,

      codigo_acta: toNumber(codigoActa),
      codigo_mesa: toNumber(codigoActa),

      nro_mesa:
        datosExtraidos.nro_mesa !== undefined
          ? toNumber(datosExtraidos.nro_mesa)
          : toNumber(String(codigoActa || "").slice(-3)) || 1,

      votantes_habilitados: votantesHabilitados,
      electores_habilitados: votantesHabilitados,

      P1: toNumber(datosExtraidos.P1 ?? datosExtraidos.p1),
      P2: toNumber(datosExtraidos.P2 ?? datosExtraidos.p2),
      P3: toNumber(datosExtraidos.P3 ?? datosExtraidos.p3),
      P4: toNumber(datosExtraidos.P4 ?? datosExtraidos.p4),

      candidato_1: toNumber(
        datosExtraidos.candidato_1 ?? datosExtraidos.P1 ?? datosExtraidos.p1
      ),
      candidato_2: toNumber(
        datosExtraidos.candidato_2 ?? datosExtraidos.P2 ?? datosExtraidos.p2
      ),
      candidato_3: toNumber(
        datosExtraidos.candidato_3 ?? datosExtraidos.P3 ?? datosExtraidos.p3
      ),
      candidato_4: toNumber(
        datosExtraidos.candidato_4 ?? datosExtraidos.P4 ?? datosExtraidos.p4
      ),

      votos_validos: votosValidos,
      votos_blancos: votosBlancos,
      votos_nulos: votosNulos,

      papeletas_anfora: papeletasAnfora,
      papeletas_no_utilizadas: papeletasNoUtilizadas,

      apertura_hora: toNumber(datosExtraidos.apertura_hora ?? 8),
      apertura_minutos: toNumber(datosExtraidos.apertura_minutos ?? 0),
      cierre_hora: toNumber(datosExtraidos.cierre_hora ?? 16),
      cierre_minutos: toNumber(datosExtraidos.cierre_minutos ?? 30),

      estado: datosExtraidos.estado || "PENDIENTE_REVISION",
      canal_ingreso: "OCR_MOVIL",
      usuario: usuario || "movil",
      fecha_registro: new Date(),
      created_at: new Date(),
    };

    const db = getDb(req);

    if (!db) {
      throw new Error("No hay conexión a MongoDB configurada.");
    }

    await db.collection("actas_ocr").insertOne({
      ...actaCompletaParaValidar,
      nombre_archivo: file.originalname,
      tamanio_archivo: file.size,
      mimetype: file.mimetype,
      datos_crudos_ocr: datosExtraidos,
      fecha_registro: new Date(),
    });

    const resultado = await validarYGuardarActaMongo(
      db,
      actaCompletaParaValidar,
      {
        nombre_archivo: file.originalname,
        tamanio: file.size,
        mimetype: file.mimetype,
        usuario: usuario || "movil",
      }
    );

    if (resultado.ok) {
      return res.status(200).json(resultado);
    }

    return res.status(422).json(resultado);
  } catch (error) {
    console.error("Error en uploadActaMobile:", error);

    return res.status(500).json({
      ok: false,
      message: "Error interno procesando el acta.",
      error: error.message,
    });
  }
};

// =========================================================
// DASHBOARD CONTEO RÁPIDO
// =========================================================
export const getResumenConteoRapido = async (req, res) => {
  try {
    const db = getDb(req);

    const smsProcesadosFilter = getSmsProcesadosFilter();
    const smsErrorFilter = getSmsErrorFilter();

    const [
      actasOCRCount,
      actasPreliminaresCount,
      actasTREPCount,
      smsProcesadosCount,
      smsErrorCount,
      smsTotalCount,
      logsCount,
    ] = await Promise.all([
      safeCount(db, "actas_ocr"),
      safeCount(db, "actas_preliminares"),
      safeCount(db, "actas_trep"),

      // Este es el que debe usar tu dashboard.
      // Solo cuenta SMS procesados, válidos, OK, insertados o aceptados.
      safeCount(db, "sms_recibidos", smsProcesadosFilter),

      // Este solo sirve para mostrar o depurar errores.
      safeCount(db, "sms_recibidos", smsErrorFilter),

      // Este es el total real en Mongo, pero NO debe usarse como procesados.
      safeCount(db, "sms_recibidos"),

      safeCount(db, "inconsistencias_logs"),
    ]);

    const actasPreliminares = await safeFind(
      db,
      "actas_preliminares",
      { fecha_registro: -1 },
      5000
    );

    const actasTREP = await safeFind(
      db,
      "actas_trep",
      { fecha_registro: -1 },
      5000
    );

    const baseConteo = actasTREP.length > 0 ? actasTREP : actasPreliminares;

    const votosPorCandidato = calcularVotosPorCandidato(baseConteo);
    const totalVotos = calcularTotalVotos(votosPorCandidato);
    const ganador = calcularGanador(votosPorCandidato);

    return res.status(200).json({
      ok: true,
      data: {
        total_actas_ocr: actasOCRCount,
        total_actas_preliminares: actasPreliminaresCount,
        total_actas_trep: actasTREPCount,

        // IMPORTANTE:
        // Mantengo este nombre para que tu frontend no se rompa,
        // pero ahora significa "SMS procesados".
        total_sms_recibidos: smsProcesadosCount,

        // Extras útiles por si quieres mostrar detalle.
        total_sms_procesados: smsProcesadosCount,
        total_sms_error: smsErrorCount,
        total_sms_general_mongo: smsTotalCount,

        total_inconsistencias: logsCount,
        votos_por_candidato: votosPorCandidato,
        total_votos: totalVotos,
        ganador,
      },
    });
  } catch (error) {
    console.error("Error en getResumenConteoRapido:", error);

    return res.status(500).json({
      ok: false,
      message: "Error obteniendo resumen de conteo rápido.",
      error: error.message,
    });
  }
};

export const getActasOCR = async (req, res) => {
  try {
    const db = getDb(req);

    const actas = await safeFind(
      db,
      "actas_ocr",
      { fecha_registro: -1 },
      100
    );

    return res.status(200).json({
      ok: true,
      data: actas,
      total: actas.length,
    });
  } catch (error) {
    console.error("Error en getActasOCR:", error);

    return res.status(500).json({
      ok: false,
      message: "Error obteniendo actas OCR.",
      error: error.message,
    });
  }
};

export const getActasPreliminares = async (req, res) => {
  try {
    const db = getDb(req);

    const actas = await safeFind(
      db,
      "actas_preliminares",
      { fecha_registro: -1 },
      200
    );

    const formattedActas = actas.map((acta) => ({
      ...acta,
      id: acta._id?.toString?.() || acta.id,
      codigo_mesa: acta.codigo_mesa ?? acta.codigo_acta,
      codigo_acta: acta.codigo_acta ?? acta.codigo_mesa,
      numero_mesa: acta.numero_mesa ?? acta.nro_mesa,
      candidato_1: toNumber(acta.candidato_1 ?? acta.P1 ?? acta.p1),
      candidato_2: toNumber(acta.candidato_2 ?? acta.P2 ?? acta.p2),
      candidato_3: toNumber(acta.candidato_3 ?? acta.P3 ?? acta.p3),
      candidato_4: toNumber(acta.candidato_4 ?? acta.P4 ?? acta.p4),
      P1: toNumber(acta.P1 ?? acta.p1 ?? acta.candidato_1),
      P2: toNumber(acta.P2 ?? acta.p2 ?? acta.candidato_2),
      P3: toNumber(acta.P3 ?? acta.p3 ?? acta.candidato_3),
      P4: toNumber(acta.P4 ?? acta.p4 ?? acta.candidato_4),
      votos_validos: toNumber(acta.votos_validos),
      votos_blancos: toNumber(acta.votos_blancos),
      votos_nulos: toNumber(acta.votos_nulos),
      estado: acta.estado || "PENDIENTE",
    }));

    return res.status(200).json({
      ok: true,
      data: formattedActas,
      total: formattedActas.length,
    });
  } catch (error) {
    console.error("Error en getActasPreliminares:", error);

    return res.status(500).json({
      ok: false,
      message: "Error obteniendo actas preliminares.",
      error: error.message,
    });
  }
};

export const getActasTREP = async (req, res) => {
  try {
    const db = getDb(req);

    const actas = await safeFind(
      db,
      "actas_trep",
      { fecha_registro: -1 },
      200
    );

    return res.status(200).json({
      ok: true,
      data: actas,
      total: actas.length,
    });
  } catch (error) {
    console.error("Error en getActasTREP:", error);

    return res.status(500).json({
      ok: false,
      message: "Error obteniendo actas TREP.",
      error: error.message,
    });
  }
};

export const getSMSRecibidos = async (req, res) => {
  try {
    const db = getDb(req);

    const smsProcesadosFilter = getSmsProcesadosFilter();

    const sms = await safeFind(
      db,
      "sms_recibidos",
      { fecha_registro: -1 },
      100,
      smsProcesadosFilter
    );

    return res.status(200).json({
      ok: true,
      data: sms,
      total: sms.length,
    });
  } catch (error) {
    console.error("Error en getSMSRecibidos:", error);

    return res.status(500).json({
      ok: false,
      message: "Error obteniendo SMS recibidos.",
      error: error.message,
    });
  }
};

export const getEstadisticasConteo = async (req, res) => {
  try {
    const db = getDb(req);

    const smsProcesadosFilter = getSmsProcesadosFilter();

    const [
      ocrEstados,
      preliminaresEstados,
      preliminaresCanal,
      trepEstados,
      smsEstados,
      inconsistenciasTipo,
    ] = await Promise.all([
      db
        .collection("actas_ocr")
        .aggregate([
          {
            $group: {
              _id: "$estado",
              total: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ])
        .toArray()
        .catch(() => []),

      db
        .collection("actas_preliminares")
        .aggregate([
          {
            $group: {
              _id: "$estado",
              total: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ])
        .toArray()
        .catch(() => []),

      db
        .collection("actas_preliminares")
        .aggregate([
          {
            $group: {
              _id: "$canal_ingreso",
              total: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ])
        .toArray()
        .catch(() => []),

      db
        .collection("actas_trep")
        .aggregate([
          {
            $group: {
              _id: "$estado",
              total: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ])
        .toArray()
        .catch(() => []),

      db
        .collection("sms_recibidos")
        .aggregate([
          {
            $match: smsProcesadosFilter,
          },
          {
            $group: {
              _id: "$estado",
              total: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ])
        .toArray()
        .catch(() => []),

      db
        .collection("inconsistencias_logs")
        .aggregate([
          {
            $group: {
              _id: "$tipo_error",
              total: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ])
        .toArray()
        .catch(() => []),
    ]);

    return res.status(200).json({
      ok: true,
      data: {
        ocr_estados: ocrEstados,
        preliminares_estados: preliminaresEstados,
        preliminares_canal: preliminaresCanal,
        trep_estados: trepEstados,
        sms_estados: smsEstados,
        inconsistencias_tipo: inconsistenciasTipo,
      },
    });
  } catch (error) {
    console.error("Error en getEstadisticasConteo:", error);

    return res.status(500).json({
      ok: false,
      message: "Error obteniendo estadísticas del conteo.",
      error: error.message,
    });
  }
};