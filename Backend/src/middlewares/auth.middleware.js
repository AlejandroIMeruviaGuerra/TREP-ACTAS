import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      ok: false,
      message: "No se envió token",
    });
  }

  const token = authorization.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "demo_secret");
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({
      ok: false,
      message: "Token inválido o expirado",
    });
  }
}