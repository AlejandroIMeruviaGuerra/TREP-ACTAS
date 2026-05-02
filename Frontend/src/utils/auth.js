const AUTH_KEY = "conteo_resultados_user";

export function getCurrentUser() {
  const rawUser = localStorage.getItem(AUTH_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function loginUser({ username, password }) {
  const cleanUsername = String(username || "").trim();
  const cleanPassword = String(password || "").trim();

  if (cleanUsername.length < 3) {
    return {
      ok: false,
      message: "El usuario debe tener al menos 3 caracteres.",
    };
  }

  if (cleanPassword.length < 3) {
    return {
      ok: false,
      message: "La contraseña debe tener al menos 3 caracteres.",
    };
  }

  const user = {
    username: cleanUsername,
    role: "ADMIN",
    loginAt: new Date().toISOString(),
  };

  localStorage.setItem(AUTH_KEY, JSON.stringify(user));

  return {
    ok: true,
    user,
  };
}

export function logoutUser() {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated() {
  return Boolean(getCurrentUser());
}