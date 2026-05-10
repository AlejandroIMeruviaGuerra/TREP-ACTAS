import { Router } from "express";
import { recibirSMSWebhook } from "../controllers/sms.controller.js";

const router = Router();

router.post("/webhook", recibirSMSWebhook);

export default router;