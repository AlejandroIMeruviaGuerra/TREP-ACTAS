import { Router } from "express";
import multer from "multer";
import {
  getResumenConteoRapido,
  getActasOCR,
  getActasPreliminares,
  getActasTREP,
  getSMSRecibidos,
  getEstadisticasConteo,
  uploadActaMobile // <- NUESTRA NUEVA FUNCIÓN
} from "../controllers/conteo-rapido.controller.js";

const router = Router();

// Configurar multer para mantener la imagen/PDF en la memoria RAM temporalmente
const upload = multer({ storage: multer.memoryStorage() });

// --- Rutas GET que ya tenías ---
router.get("/resumen", getResumenConteoRapido);
router.get("/actas-ocr", getActasOCR);
router.get("/actas-preliminares", getActasPreliminares);
router.get("/actas-trep", getActasTREP);
router.get("/sms-recibidos", getSMSRecibidos);
router.get("/estadisticas", getEstadisticasConteo);

// --- NUEVA RUTA POST PARA LA APP MÓVIL ---
// "file" es el nombre del campo que debe enviar el Frontend
router.post("/upload-acta", upload.single("file"), uploadActaMobile);

export default router;