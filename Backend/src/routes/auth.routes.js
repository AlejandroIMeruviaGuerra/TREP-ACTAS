import { Router } from "express";
import { login, verifyToken } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/login", login);
router.get("/verify", authMiddleware, verifyToken);

export default router;