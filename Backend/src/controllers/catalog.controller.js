import { supabase } from "../config/supabaseClient.js";

export async function getDepartamentos(req, res) {
  const { data, error } = await supabase
    .from("territorios")
    .select("departamento")
    .order("departamento", { ascending: true });

  if (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo departamentos",
      error: error.message,
    });
  }

  const departamentos = [...new Set(data.map((item) => item.departamento))];

  return res.json({
    ok: true,
    data: departamentos,
  });
}

export async function getProvincias(req, res) {
  const { departamento } = req.query;

  let query = supabase
    .from("territorios")
    .select("codigo_territorial, departamento, provincia, municipio")
    .order("provincia", { ascending: true });

  if (departamento) {
    query = query.eq("departamento", departamento);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo provincias",
      error: error.message,
    });
  }

  return res.json({
    ok: true,
    data,
  });
}

export async function getMunicipios(req, res) {
  const { departamento, provincia } = req.query;

  let query = supabase
    .from("territorios")
    .select("codigo_territorial, departamento, provincia, municipio")
    .order("municipio", { ascending: true });

  if (departamento) {
    query = query.eq("departamento", departamento);
  }

  if (provincia) {
    query = query.eq("provincia", provincia);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo municipios",
      error: error.message,
    });
  }

  return res.json({
    ok: true,
    data,
  });
}

export async function getTerritorios(req, res) {
  const { departamento, provincia, municipio } = req.query;

  let query = supabase
    .from("territorios")
    .select("*")
    .order("codigo_territorial", { ascending: true });

  if (departamento) query = query.eq("departamento", departamento);
  if (provincia) query = query.eq("provincia", provincia);
  if (municipio) query = query.eq("municipio", municipio);

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo territorios",
      error: error.message,
    });
  }

  return res.json({
    ok: true,
    data,
  });
}

export async function getRecintos(req, res) {
  const { codigo_territorial } = req.query;

  let query = supabase
    .from("recintos")
    .select("*")
    .order("nombre_recinto", { ascending: true });

  if (codigo_territorial) {
    query = query.eq("codigo_territorial", codigo_territorial);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo recintos",
      error: error.message,
    });
  }

  return res.json({
    ok: true,
    data,
  });
}

export async function getMesas(req, res) {
  const { codigo_recinto, estado_acta } = req.query;

  let query = supabase
    .from("mesas")
    .select("*")
    .order("codigo_acta", { ascending: true });

  if (codigo_recinto) {
    query = query.eq("codigo_recinto", codigo_recinto);
  }

  if (estado_acta) {
    query = query.eq("estado_acta", estado_acta);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo mesas",
      error: error.message,
    });
  }

  return res.json({
    ok: true,
    data,
  });
}

export async function getMesaByCodigoActa(req, res) {
  const { codigo_acta } = req.params;

  const { data, error } = await supabase
    .from("mesas")
    .select("*")
    .eq("codigo_acta", codigo_acta)
    .maybeSingle();

  if (error) {
    return res.status(500).json({
      ok: false,
      message: "Error obteniendo mesa",
      error: error.message,
    });
  }

  if (!data) {
    return res.status(404).json({
      ok: false,
      message: "Mesa no encontrada",
    });
  }

  return res.json({
    ok: true,
    data,
  });
}