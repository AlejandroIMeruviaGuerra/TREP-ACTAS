const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    // Normalizar la respuesta siempre con { ok, data, message }
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        message: data.message || data.error || "Error en la petición",
        errors: data.errors || [],
        status: response.status,
      };
    }

    // Respuesta exitosa: asegurar que siempre tenga la estructura esperada
    return {
      ok: true,
      data: data.data || data,  // Si el backend ya tiene data, la usa; si no, usa todo
      message: data.message || "OK",
      status: response.status,
    };
  } catch (error) {
    console.error("Error API:", error.message);

    return {
      ok: false,
      data: null,
      message: error.message,
      errors: [error.message],
      status: 500,
    };
  }
}

export const apiClient = {
  get(endpoint) {
    return request(endpoint, { method: "GET" });
  },

  post(endpoint, body) {
    return request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  patch(endpoint, body) {
    return request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  // Método adicional útil para DELETE si lo necesitas
  delete(endpoint) {
    return request(endpoint, { method: "DELETE" });
  },

  // Método PUT si lo necesitas
  put(endpoint, body) {
    return request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
};