// Corregimos el texto de fallback para la URL de la API
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function uploadFile(endpoint, file, extraData = {}) {
  try {
    const formData = new FormData();
    // La clave "file" es la que configuramos en multer en el backend
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
        // Agregamos data.error porque así lo mandamos desde el controlador Node.js
        message: data.message || data.error || "Error enviando archivo al backend",
        data,
      };
    }

    // Devolvemos la data directamente (el backend ya manda { ok: true, data: {...} })
    return data;
  } catch (error) {
    return {
      ok: false,
      message: error.message || "Error de conexión con backend",
    };
  }
}

// ------------------------------------------------------------------
// Ambas funciones ahora apuntan a nuestro nuevo motor OCR.
// El script de Python detectará automáticamente si es PDF o Imagen.
// ------------------------------------------------------------------

export async function uploadActaPdf(file, usuario = "") {
  return uploadFile("/api/conteo-rapido/upload-acta", file, {
    usuario,
    tipo: "PDF_ACTA",
  });
}

export async function uploadActaPhoto(file, usuario = "") {
  return uploadFile("/api/conteo-rapido/upload-acta", file, {
    usuario,
    tipo: "FOTO_ACTA",
  });
}