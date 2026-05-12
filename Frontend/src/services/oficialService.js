import { apiClient } from "../api/apiClient";
import { getCurrentUser } from "../utils/auth";

export async function getResumenOficial() {
  return apiClient.get("/api/oficial/resumen");
}

export async function getActasOficiales() {
  return apiClient.get("/api/oficial/actas");
}

export async function getActasOficialesDetalle() {
  return apiClient.get("/api/oficial/actas/detalle");
}

export async function getCatalogoOficial() {
  return apiClient.get("/api/oficial/catalogo");
}

export async function crearMesaYActaOficial(payload) {
  // Clonar el payload para no modificar el original
  const finalPayload = { ...payload };
  
  // Agregar usuario_revision si no existe
  if (!finalPayload.usuario_revision) {
    const currentUser = getCurrentUser();
    finalPayload.usuario_revision = currentUser?.username || "sistema";
  }
  
  // Validar que usuario_revision no esté vacío
  if (!finalPayload.usuario_revision || finalPayload.usuario_revision.trim() === "") {
    finalPayload.usuario_revision = "usuario_desconocido";
  }

  console.log("📝 Enviando payload a /api/oficial/crear-acta:", finalPayload);

  const response = await apiClient.post("/api/oficial/crear-acta", finalPayload);
  
  console.log("📥 Respuesta del servidor:", response);

  if (!response.ok) {
    const errorMsg = response.message || response.errors?.join(", ") || "Error al crear el acta";
    throw new Error(errorMsg);
  }

  return response;
}

export async function getActasObservadas() {
  return apiClient.get("/api/oficial/observadas/detalle");
}

export async function getActasObservadasTodas() {
  return apiClient.get("/api/oficial/observadas/detalle?estado=TODAS");
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