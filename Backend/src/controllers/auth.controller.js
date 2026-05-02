import { loginUser } from "../services/auth.service.js";

export async function login(req, res) {
  try {
    const { username, password } = req.body;

    const result = await loginUser(username, password);

    if (!result.ok) {
      return res.status(401).json(result);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Error interno en login",
      error: error.message,
    });
  }
}

export function verifyToken(req, res) {
  return res.json({
    ok: true,
    message: "Token válido",
    user: req.user,
  });
}