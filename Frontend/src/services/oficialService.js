import { apiClient } from "../api/apiClient";

export async function getResumenOficial() {
  return apiClient.get("/api/oficial/resumen");
}

export async function getActasOficiales() {
  return apiClient.get("/api/oficial/actas");
}

export async function getActasOficialesDetalle() {
  return apiClient.get("/api/oficial/actas/detalle");
}

export async function getActasObservadas() {
  return apiClient.get("/api/oficial/observadas/detalle");
}

export async function getLogsOficiales() {
  return apiClient.get("/api/oficial/logs");
}

export async function getEventosOficiales() {
  return apiClient.get("/api/oficial/events");
}

export async function aprobarActaObservada(
  codigoActa,
  comentario = "",
  usuarioRevision = ""
) {
  return apiClient.patch(`/api/oficial/observadas/${codigoActa}/aprobar`, {
    comentario,
    usuario_revision: usuarioRevision,
  });
}

export async function rechazarActaObservada(
  codigoActa,
  comentario = "",
  usuarioRevision = ""
) {
  return apiClient.patch(`/api/oficial/observadas/${codigoActa}/rechazar`, {
    comentario,
    usuario_revision: usuarioRevision,
  });
}