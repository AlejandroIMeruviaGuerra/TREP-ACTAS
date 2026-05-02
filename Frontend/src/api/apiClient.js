const API_URL = import.meta.env.VITE_API_URL || "https://unluckily-headgear-limb.ngrok-free.dev";

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

    if (!response.ok) {
      throw new Error(data.message || data.error || "Error en la petición");
    }

    return data;
  } catch (error) {
    console.error("Error API:", error.message);

    return {
      ok: false,
      data: null,
      message: error.message,
    };
  }
}

export const apiClient = {
  get(endpoint) {
    return request(endpoint);
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
};