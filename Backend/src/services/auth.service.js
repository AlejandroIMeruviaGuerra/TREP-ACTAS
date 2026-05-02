import jwt from "jsonwebtoken";
import { supabase } from "../config/supabaseClient.js";

export async function loginUser(username, password) {
  if (!username || !password) {
    return {
      ok: false,
      message: "Usuario y contraseña son obligatorios",
    };
  }

  const { data, error } = await supabase
    .from("usuarios_app")
    .select("*")
    .eq("username", username)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: "Error consultando usuario",
      error: error.message,
    };
  }

  if (!data || data.password_text !== password) {
    return {
      ok: false,
      message: "Credenciales incorrectas",
    };
  }

  const token = jwt.sign(
    {
      id_usuario: data.id_usuario,
      username: data.username,
      nombre: data.nombre,
      rol: data.rol,
    },
    process.env.JWT_SECRET || "demo_secret",
    { expiresIn: "8h" }
  );

  return {
    ok: true,
    message: "Login correcto",
    token,
    user: {
      id_usuario: data.id_usuario,
      username: data.username,
      nombre: data.nombre,
      rol: data.rol,
    },
  };
}