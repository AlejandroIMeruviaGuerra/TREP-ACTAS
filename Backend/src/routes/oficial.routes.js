import { Router } from "express";
import multer from "multer";

import {
  insertOfficialActa,
  uploadOfficialCsv,
  receiveN8nActa,
  getOfficialActas,
  getOfficialSummary,
  getOfficialLogs,
  getOfficialEvents,
  getObservedActas,
  getOfficialActasDetalle,
  getObservedActasDetalle,
  approveObservedActa,
  rejectObservedActa,
} from "../controllers/oficial.controller.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/actas", insertOfficialActa);
router.post("/n8n/acta", receiveN8nActa);
router.post("/csv", upload.single("file"), uploadOfficialCsv);

router.get("/actas/detalle", getOfficialActasDetalle);
router.get("/actas", getOfficialActas);

router.get("/observadas/detalle", getObservedActasDetalle);
router.get("/observadas", getObservedActas);
router.patch("/observadas/:codigoActa/aprobar", approveObservedActa);
router.patch("/observadas/:codigoActa/rechazar", rejectObservedActa);

router.get("/resumen", getOfficialSummary);
router.get("/logs", getOfficialLogs);
router.get("/events", getOfficialEvents);

export default router;