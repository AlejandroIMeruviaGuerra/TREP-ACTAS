import { Router } from "express";

import {
  getDepartamentos,
  getProvincias,
  getMunicipios,
  getTerritorios,
  getRecintos,
  getMesas,
  getMesaByCodigoActa,
} from "../controllers/catalog.controller.js";

const router = Router();

router.get("/departamentos", getDepartamentos);
router.get("/provincias", getProvincias);
router.get("/municipios", getMunicipios);
router.get("/territorios", getTerritorios);
router.get("/recintos", getRecintos);
router.get("/mesas", getMesas);
router.get("/mesas/:codigo_acta", getMesaByCodigoActa);

export default router;