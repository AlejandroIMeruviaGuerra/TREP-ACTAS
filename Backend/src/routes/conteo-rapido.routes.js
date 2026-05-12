import { Router } from "express";
import {
  getResumenConteoRapido,
  getActasOCR,
  getActasPreliminares,
  getActasTREP,
  getSMSRecibidos,
  getEstadisticasConteo,
} from "../controllers/conteo-rapido.controller.js";

const router = Router();

router.get("/resumen", getResumenConteoRapido);
router.get("/actas-ocr", getActasOCR);
router.get("/actas-preliminares", getActasPreliminares);
router.get("/actas-trep", getActasTREP);
router.get("/sms-recibidos", getSMSRecibidos);
router.get("/estadisticas", getEstadisticasConteo);

export default router;