import dotenv from "dotenv";
dotenv.config();

import express from "express";
import multer from "multer";
import FormData from "form-data";
import axios from "axios";
import { MongoClient } from "mongodb";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const PYTHON_OCR_API = process.env.PYTHON_OCR_API || "http://localhost:8000";

if (!process.env.MONGO_URI) {
  throw new Error("Falta MONGO_URI en Backend/.env");
}

const mongoClient = new MongoClient(process.env.MONGO_URI);
let mongoReady = false;

async function getMongoDbs() {
  if (!mongoReady) {
    await mongoClient.connect();
    mongoReady = true;
    console.log("✅ MongoDB conectado");
  }

  return {
    db1: mongoClient.db("DBTrep_1"),
    db2: mongoClient.db("DBTrep_2"),
  };
}

async function guardarEnMongo(resultadoPython, archivo, usuario) {
  const { db1, db2 } = await getMongoDbs();

  const resultado = resultadoPython.resultado || resultadoPython;

  const documento = {
    usuario: usuario || "usuario_movil",
    nombre_archivo: archivo.originalname,
    tipo_archivo: archivo.mimetype,
    tamanio_bytes: archivo.size,

    archivo_local_ocr: resultado.archivo || null,
    pdf_original: resultado.pdf_original || null,
    orientacion_usada: resultado.orientacion_usada || null,
    roboflow_version: resultado.roboflow_version || null,

    datos_extraidos: resultado.datos_extraidos || {},
    detecciones: resultado.detecciones || [],
    validacion: resultado.validacion || {},

    estado: resultado.validacion?.estado || "SIN_ESTADO",
    errores: resultado.validacion?.errores || [],
    advertencias: resultado.validacion?.advertencias || [],

    fecha_registro: new Date(),
    origen: "FRONTEND_MOVIL_OCR",
  };

  const insert1 = await db1.collection("actas_ocr").insertOne(documento);
  const insert2 = await db2.collection("actas_ocr").insertOne(documento);

  return {
    db1_id: insert1.insertedId,
    db2_id: insert2.insertedId,
  };
}

router.post("/photo", upload.single("file"), async (req, res) => {
  try {
    console.log("📸 Recibiendo foto desde frontend...");

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: "No se recibió ninguna imagen.",
      });
    }

    const usuario = req.body.usuario || "usuario_movil";

    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    console.log("➡️ Enviando imagen a Python OCR...");

    const responseOCR = await axios.post(
      `${PYTHON_OCR_API}/procesar-acta`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: 180000,
      }
    );

    console.log("✅ OCR respondió correctamente");
    console.log("💾 Guardando resultado en MongoDB...");

    const mongo = await guardarEnMongo(responseOCR.data, req.file, usuario);

    console.log("✅ Guardado en Mongo:", mongo);

    return res.json({
      ok: true,
      message: "Foto procesada y guardada correctamente.",
      mongo,
      resultado: responseOCR.data,
    });
  } catch (error) {
    console.error("❌ ERROR MOBILE PHOTO:");
    console.error(error.response?.data || error.message);

    return res.status(500).json({
      ok: false,
      message: "Error procesando o guardando el acta.",
      error: error.response?.data || error.message,
    });
  }
});

router.post("/pdf", upload.single("file"), async (req, res) => {
  return res.status(501).json({
    ok: false,
    message: "Procesamiento PDF aún no implementado.",
  });
});

export default router;