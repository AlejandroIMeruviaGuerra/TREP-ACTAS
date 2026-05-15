import { validarYGuardarActaMongo } from "../services/actaValidation.service.js";
import { procesarImagenOCR } from "../services/ocr.service.js";

// =========================================================
// RECEPCIÓN DE ACTA MÓVIL (FOTO/PDF)
// =========================================================
export const uploadActaMobile = async (req, res) => {
  try {
    const file = req.file;
    const { usuario } = req.body; 

    if (!file) {
      return res.status(400).json({ 
        ok: false, 
        message: "No se recibió ningún archivo PDF o Imagen." 
      });
    }

    console.log(`\n📸 Iniciando procesamiento de: ${file.originalname}`);

    // 1. Extracción real con Python + OpenCV + Tesseract
    const datosExtraidos = await procesarImagenOCR(file.buffer, file.originalname);
    
    console.log("✅ Datos extraídos por OCR:", datosExtraidos);

    // Como nuestro regex solo saca los votos, rellenamos datos de cabecera obligatorios
    // (En la vida real estos los mandarías desde el celular al escanear el QR o escribirlos)
    const actaCompletaParaValidar = {
        ...datosExtraidos,
        nro_mesa: Number(String(datosExtraidos.codigo_acta).substring(0, 4)) || 1010,
        votantes_habilitados: datosExtraidos.votos_validos + datosExtraidos.votos_blancos + datosExtraidos.votos_nulos + 62, // Simulando las no utilizadas
        papeletas_anfora: datosExtraidos.votos_validos + datosExtraidos.votos_blancos + datosExtraidos.votos_nulos,
        papeletas_no_utilizadas: 62,
        apertura_hora: 8, apertura_minutos: 0,
        cierre_hora: 16, cierre_minutos: 30
    };

    // 2. Conexión a la base de datos
    const db = req.app.locals.db; 
    if (!db) {
        throw new Error("No hay conexión a MongoDB configurada en app.locals.db");
    }

    // 3. Validar y Guardar
    const resultado = await validarYGuardarActaMongo(db, actaCompletaParaValidar, { 
      nombre_archivo: file.originalname,
      tamanio: file.size
    });

    if (resultado.ok) {
      return res.status(200).json(resultado);
    } else {
      return res.status(422).json(resultado);
    }

  } catch (error) {
    console.error("❌ Error en uploadActaMobile:", error);
    return res.status(500).json({ 
      ok: false, 
      message: "Error interno procesando el acta.", 
      error: error.message 
    });
  }
};

// =========================================================
// OTRAS RUTAS DEL DASHBOARD (Mocks temporales)
// =========================================================
export const getResumenConteoRapido = async (req, res) => {
  res.status(200).json({ message: "Resumen en construcción" });
};

export const getActasOCR = async (req, res) => {
  res.status(200).json({ message: "Actas OCR en construcción" });
};

export const getActasPreliminares = async (req, res) => {
  res.status(200).json({ message: "Actas preliminares en construcción" });
};

export const getActasTREP = async (req, res) => {
  try {
    const db = req.app.locals.db;
    if(db){
        const actas = await db.collection("actas_trep").find().toArray();
        return res.status(200).json({ ok: true, data: actas });
    }
    res.status(200).json({ message: "Endpoint de Actas TREP" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSMSRecibidos = async (req, res) => {
  res.status(200).json({ message: "SMS en construcción" });
};

export const getEstadisticasConteo = async (req, res) => {
  res.status(200).json({ message: "Estadísticas en construcción" });
};