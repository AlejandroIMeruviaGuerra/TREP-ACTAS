const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function uploadFile(endpoint, file, extraData = {}) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    Object.entries(extraData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        message: data.message || "Error enviando archivo al backend",
        data,
      };
    }

    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message || "Error de conexión con backend",
    };
  }
}

export async function uploadActaPdf(file, usuario = "") {
  return uploadFile("/api/mobile/pdf", file, {
    usuario,
    tipo: "PDF_ACTA",
  });
}

export async function uploadActaPhoto(file, usuario = "") {
  return uploadFile("/api/mobile/photo", file, {
    usuario,
    tipo: "FOTO_ACTA",
  });
}