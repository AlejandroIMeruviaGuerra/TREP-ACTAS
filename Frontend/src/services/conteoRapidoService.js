import { apiClient } from "../api/apiClient";

export async function getResumenConteoRapido() {
  return apiClient.get("/api/conteo-rapido/resumen");
}

export async function getActasOCR() {
  return apiClient.get("/api/conteo-rapido/actas-ocr");
}

export async function getActasPreliminares() {
  return apiClient.get("/api/conteo-rapido/actas-preliminares");
}

export async function getActasTREP() {
  return apiClient.get("/api/conteo-rapido/actas-trep");
}

export async function getSMSRecibidos() {
  return apiClient.get("/api/conteo-rapido/sms-recibidos");
}

export async function getEstadisticasConteo() {
  return apiClient.get("/api/conteo-rapido/estadisticas");
}