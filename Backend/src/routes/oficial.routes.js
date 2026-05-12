import { Router } from "express";
import multer from "multer";

import {
  approveObservedActa,
  createOfficialMesaAndActa,
  getObservedActas,
  getObservedActasDetalle,
  getOfficialActas,
  getOfficialActasDetalle,
  getOfficialCatalog,
  getOfficialEvents,
  getOfficialLogs,
  getOfficialSummary,
  insertOfficialActa,
  receiveN8nActa,
  rejectObservedActa,
  uploadOfficialCsv,
} from "../controllers/oficial.controller.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/acta", insertOfficialActa);
router.post("/n8n/acta", receiveN8nActa);
router.post("/upload-csv", upload.single("file"), uploadOfficialCsv);

router.get("/catalogo", getOfficialCatalog);
router.post("/crear-acta", createOfficialMesaAndActa);

router.get("/actas", getOfficialActas);
router.get("/actas/detalle", getOfficialActasDetalle);

router.get("/observadas", getObservedActas);
router.get("/observadas/detalle", getObservedActasDetalle);
router.patch("/observadas/:codigoActa/aprobar", approveObservedActa);
router.patch("/observadas/:codigoActa/rechazar", rejectObservedActa);

router.get("/resumen", getOfficialSummary);
router.get("/logs", getOfficialLogs);
router.get("/events", getOfficialEvents);

export default router;