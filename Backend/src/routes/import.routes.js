import { Router } from "express";

import {
  importTerritorio,
  importRecinto,
  importMesa,
} from "../controllers/import.controller.js";

const router = Router();

router.post("/territorio", importTerritorio);
router.post("/recinto", importRecinto);
router.post("/mesa", importMesa);

export default router;