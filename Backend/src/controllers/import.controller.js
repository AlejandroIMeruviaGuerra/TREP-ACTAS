import {
  upsertTerritorio,
  upsertRecinto,
  upsertMesa,
} from "../services/import.service.js";

export async function importTerritorio(req, res) {
  try {
    const result = await upsertTerritorio(req.body);

    return res.json({
      ok: true,
      result,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: "Error importando territorio",
      error: error.message,
      row: req.body,
    });
  }
}

export async function importRecinto(req, res) {
  try {
    const result = await upsertRecinto(req.body);

    return res.json({
      ok: true,
      result,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: "Error importando recinto",
      error: error.message,
      row: req.body,
    });
  }
}

export async function importMesa(req, res) {
  try {
    const result = await upsertMesa(req.body);

    return res.json({
      ok: true,
      result,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: "Error importando mesa",
      error: error.message,
      row: req.body,
    });
  }
}