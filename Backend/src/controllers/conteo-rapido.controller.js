import { getMongoDb } from "../config/mongoClient.js";

// Obtener resumen general del conteo rápido
export async function getResumenConteoRapido(req, res) {
  try {
    const db = getMongoDb();
    
    const [actasOCRCount, actasPreliminaresCount, actasTREPCount, smsCount] = await Promise.all([
      db.collection("actas_ocr").countDocuments(),
      db.collection("actas_preliminares").countDocuments(),
      db.collection("actas_trep").countDocuments(),
      db.collection("sms_recibidos").countDocuments(),
    ]);

    // Calcular votos por candidato desde actas_trep
    const actasTREP = await db.collection("actas_trep").find({}).toArray();
    
    const votosPorCandidato = {
      P1: 0,
      P2: 0,
      P3: 0,
      P4: 0,
    };

    actasTREP.forEach(acta => {
      votosPorCandidato.P1 += Number(acta.P1) || 0;
      votosPorCandidato.P2 += Number(acta.P2) || 0;
      votosPorCandidato.P3 += Number(acta.P3) || 0;
      votosPorCandidato.P4 += Number(acta.P4) || 0;
    });

    const totalVotos = Object.values(votosPorCandidato).reduce((a, b) => a + b, 0);

    res.json({
      ok: true,
      data: {
        total_actas_ocr: actasOCRCount,
        total_actas_preliminares: actasPreliminaresCount,
        total_actas_trep: actasTREPCount,
        total_sms_recibidos: smsCount,
        votos_por_candidato: votosPorCandidato,
        total_votos: totalVotos,
      },
    });
  } catch (error) {
    console.error("Error en getResumenConteoRapido:", error);
    res.status(500).json({
      ok: false,
      message: "Error obteniendo resumen de conteo rápido",
      error: error.message,
    });
  }
}

// Obtener todas las actas OCR
export async function getActasOCR(req, res) {
  try {
    const db = getMongoDb();
    const actas = await db.collection("actas_ocr")
      .find({})
      .sort({ fecha_registro: -1 })
      .limit(100)
      .toArray();
    
    res.json({
      ok: true,
      data: actas,
      total: actas.length,
    });
  } catch (error) {
    console.error("Error en getActasOCR:", error);
    res.status(500).json({
      ok: false,
      message: "Error obteniendo actas OCR",
      error: error.message,
    });
  }
}

// Obtener todas las actas preliminares
export async function getActasPreliminares(req, res) {
  try {
    const db = getMongoDb();
    const actas = await db.collection("actas_preliminares")
      .find({})
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();
    
    // Formatear los datos para el frontend
    const formattedActas = actas.map(acta => ({
      ...acta,
      id: acta._id,
      candidato_1: acta.candidato_1 || 0,
      candidato_2: acta.candidato_2 || 0,
      candidato_3: acta.candidato_3 || 0,
      candidato_4: acta.candidato_4 || 0,
    }));
    
    res.json({
      ok: true,
      data: formattedActas,
      total: actas.length,
    });
  } catch (error) {
    console.error("Error en getActasPreliminares:", error);
    res.status(500).json({
      ok: false,
      message: "Error obteniendo actas preliminares",
      error: error.message,
    });
  }
}

// Obtener todas las actas TREP
export async function getActasTREP(req, res) {
  try {
    const db = getMongoDb();
    const actas = await db.collection("actas_trep")
      .find({})
      .sort({ created_at: -1 })
      .limit(100)
      .toArray();
    
    res.json({
      ok: true,
      data: actas,
      total: actas.length,
    });
  } catch (error) {
    console.error("Error en getActasTREP:", error);
    res.status(500).json({
      ok: false,
      message: "Error obteniendo actas TREP",
      error: error.message,
    });
  }
}

// Obtener todos los SMS recibidos
export async function getSMSRecibidos(req, res) {
  try {
    const db = getMongoDb();
    const sms = await db.collection("sms_recibidos")
      .find({})
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();
    
    res.json({
      ok: true,
      data: sms,
      total: sms.length,
    });
  } catch (error) {
    console.error("Error en getSMSRecibidos:", error);
    res.status(500).json({
      ok: false,
      message: "Error obteniendo SMS recibidos",
      error: error.message,
    });
  }
}

// Obtener estadísticas detalladas del conteo
export async function getEstadisticasConteo(req, res) {
  try {
    const db = getMongoDb();

    // Estadísticas por estado de OCR
    const ocrEstados = await db.collection("actas_ocr").aggregate([
      { $group: { _id: "$estado", count: { $sum: 1 } } }
    ]).toArray();

    // Estadísticas por canal de ingreso de preliminares
    const preliminaresCanal = await db.collection("actas_preliminares").aggregate([
      { $group: { _id: "$canal_ingreso", count: { $sum: 1 } } }
    ]).toArray();

    // Estadísticas por estado de TREP
    const trepEstados = await db.collection("actas_trep").aggregate([
      { $group: { _id: "$estado", count: { $sum: 1 } } }
    ]).toArray();

    // Estadísticas por estado de SMS
    const smsEstados = await db.collection("sms_recibidos").aggregate([
      { $group: { _id: "$estado", count: { $sum: 1 } } }
    ]).toArray();

    res.json({
      ok: true,
      data: {
        actas_ocr_por_estado: ocrEstados,
        actas_preliminares_por_canal: preliminaresCanal,
        actas_trep_por_estado: trepEstados,
        sms_por_estado: smsEstados,
      },
    });
  } catch (error) {
    console.error("Error en getEstadisticasConteo:", error);
    res.status(500).json({
      ok: false,
      message: "Error obteniendo estadísticas",
      error: error.message,
    });
  }
}