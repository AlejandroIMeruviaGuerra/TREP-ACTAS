import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mobileRoutes from "../api/mobile/mobile.routes.js";
import authRoutes from "./routes/auth.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import oficialRoutes from "./routes/oficial.routes.js";
import importRoutes from "./routes/import.routes.js";
import smsRoutes from "./routes/sms.routes.js";
import { connectMongo } from "./config/mongoClient.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API Sistema Oficial de Votaciones",
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message: "Backend DBOficial_1 funcionando correctamente",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/oficial", oficialRoutes);
app.use("/api/import", importRoutes);
app.use("/api/mobile", mobileRoutes);
app.use("/api/sms", smsRoutes);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: "Ruta no encontrada",
  });
});

async function startServer() {
  try {
    await connectMongo();

    app.listen(PORT, () => {
      console.log(`Backend ejecutándose en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error iniciando servidor:", error);
    process.exit(1);
  }
}

startServer();