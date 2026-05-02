import path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import { Builder } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import XLSXModule from "xlsx";

const XLSX = XLSXModule.default ?? XLSXModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = "http://localhost:3001";

const EXCEL_PATH = path.resolve(
  __dirname,
  "../../../_Recursos Practica 4.xlsx"
);

/*
  IMPORTANTE:
  null = lee todas las filas de cada hoja.
  Si después quieres probar solo 200 filas, cambia null por 200.
*/
const LIMIT_ROWS = null;

function normalizeSheetName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function normalizeKey(key) {
  return String(key)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function removeEmptyRows(rows) {
  return rows.filter((row) => {
    return Object.values(row).some((value) => {
      return value !== undefined && value !== null && String(value).trim() !== "";
    });
  });
}

function readSheet(workbook, possibleNames) {
  const normalizedPossibleNames = possibleNames.map(normalizeSheetName);

  const sheetName = workbook.SheetNames.find((name) =>
    normalizedPossibleNames.includes(normalizeSheetName(name))
  );

  if (!sheetName) {
    throw new Error(
      `No se encontró la hoja. Busqué: ${possibleNames.join(
        ", "
      )}. Hojas disponibles: ${workbook.SheetNames.join(", ")}`
    );
  }

  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: true,
  });

  const cleanRows = removeEmptyRows(rows);

  return {
    sheetName,
    rows: LIMIT_ROWS ? cleanRows.slice(0, LIMIT_ROWS) : cleanRows,
    totalRowsInSheet: cleanRows.length,
  };
}

function getCell(row, possibleKeys) {
  for (const key of possibleKeys) {
    if (
      row[key] !== undefined &&
      row[key] !== null &&
      String(row[key]).trim() !== ""
    ) {
      return row[key];
    }
  }

  const rowKeys = Object.keys(row);

  for (const realKey of rowKeys) {
    const normalizedRealKey = normalizeKey(realKey);

    for (const wantedKey of possibleKeys) {
      const normalizedWantedKey = normalizeKey(wantedKey);

      if (
        normalizedRealKey === normalizedWantedKey ||
        normalizedRealKey.startsWith(normalizedWantedKey)
      ) {
        const value = row[realKey];

        if (
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
        ) {
          return value;
        }
      }
    }
  }

  return "";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithNodeFetch(endpoint, payload) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      method: "node-fetch",
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
      method: "node-fetch",
    };
  }
}

async function postWithBrowser(driver, endpoint, payload) {
  try {
    const result = await driver.executeAsyncScript(
      `
      const endpoint = arguments[0];
      const payload = arguments[1];
      const done = arguments[2];

      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
        .then(async (response) => {
          const text = await response.text();
          let data;

          try {
            data = JSON.parse(text);
          } catch {
            data = { raw: text };
          }

          done({
            ok: response.ok,
            status: response.status,
            data,
            method: "selenium-browser-fetch"
          });
        })
        .catch((error) => {
          done({
            ok: false,
            status: 0,
            error: error.message,
            method: "selenium-browser-fetch"
          });
        });
      `,
      endpoint,
      payload
    );

    if (!result) {
      console.log("Selenium devolvió null. Reintentando con Node fetch...");
      return await postWithNodeFetch(endpoint, payload);
    }

    return result;
  } catch (error) {
    console.log(
      `Error usando Selenium fetch: ${error.message}. Reintentando con Node fetch...`
    );

    return await postWithNodeFetch(endpoint, payload);
  }
}

async function importRows(driver, title, rows, endpoint, mapper) {
  console.log("\n====================================");
  console.log(`Importando: ${title}`);
  console.log(`Filas a procesar: ${rows.length}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log("====================================");

  const results = {
    total: rows.length,
    ok: 0,
    fail: 0,
    insertadas: 0,
    rechazadas: 0,
    observadas: 0,
    duplicadas: 0,
  };

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const payload = mapper(row);

    const response = await postWithBrowser(driver, endpoint, payload);

    if (!response) {
      results.fail += 1;
      console.log(`[ERROR] Fila ${index + 1}: respuesta null`);
      console.log("Payload:", payload);
      continue;
    }

    if (response.ok) {
      results.ok += 1;

      const status = response.data?.result?.status || "procesada";

      if (status === "INSERTADA") results.insertadas += 1;

      if (
        status === "RECHAZADA" ||
        status === "RECHAZADA_OBSERVADA"
      ) {
        results.rechazadas += 1;
      }

      if (
        status === "OBSERVADA" ||
        status === "OBSERVADA_MOVIDA"
      ) {
        results.observadas += 1;
      }

      if (
        status === "DUPLICADO_IGNORADO" ||
        status === "DUPLICADO_CONFLICTIVO" ||
        status === "DUPLICADO_DATOS_ALTERADOS_BORRADO_BDD"
      ) {
        results.duplicadas += 1;
      }

      const codigo =
        response.data?.result?.codigo_acta ||
        payload.CodigoActa ||
        payload.codigo_acta ||
        payload.CodigoTerritorial ||
        payload.CodigoRecinto ||
        "sin código";

      console.log(
        `[OK] Fila ${index + 1}/${rows.length}: ${status} | Código: ${codigo} | Método: ${
          response.method || "desconocido"
        }`
      );

      if (response.data?.result?.errors) {
        console.log("Motivos de rechazo:");
        console.log(response.data.result.errors);
      }

      if (response.data?.result?.message) {
        console.log("Mensaje:");
        console.log(response.data.result.message);
      }
    } else {
      results.fail += 1;

      console.log(`[ERROR] Fila ${index + 1}/${rows.length}:`);
      console.log(
        response.data?.message || response.error || "Falló la petición"
      );
      console.log("Payload:", payload);
      console.log("Respuesta:", response.data || response);
    }

    await sleep(100);
  }

  console.log(`\nResumen ${title}:`);
  console.log(results);

  return results;
}

function mapTerritorio(row) {
  return {
    CodigoTerritorial: getCell(row, [
      "CodigoTerritorial",
      "codigo_territorial",
      "CODIGO_TERRITORIAL",
    ]),
    Departamento: getCell(row, ["Departamento", "departamento"]),
    Municipio: getCell(row, ["Municipio", "municipio"]),
    Provincia: getCell(row, ["Provincia", "provincia"]),
  };
}

function mapRecinto(row) {
  return {
    CodigoTerritorial: getCell(row, [
      "CodigoTerritorial",
      "codigo_territorial",
      "CODIGO_TERRITORIAL",
    ]),
    CodigoRecinto: getCell(row, [
      "CodigoRecinto",
      "codigo_recinto",
      "CODIGO_RECINTO",
    ]),
    RecintoNombre: getCell(row, [
      "RecintoNombre",
      "nombre_recinto",
      "Recinto",
      "RECINTO_NOMBRE",
    ]),
    RecintoDireccion: getCell(row, [
      "RecintoDireccion",
      "direccion",
      "Direccion",
      "RECINTO_DIRECCION",
    ]),
    NumMesas: getCell(row, ["NumMesas", "num_mesas", "Mesas"]),
  };
}

function mapMesa(row) {
  return {
    CodigoRecinto: getCell(row, [
      "CodigoRecinto",
      "codigo_recinto",
      "CODIGO_RECINTO",
    ]),
    CodigoActa: getCell(row, [
      "CodigoActa",
      "codigo_acta",
      "CODIGO_ACTA",
    ]),
    NroMesa: getCell(row, ["NroMesa", "nro_mesa", "Mesa"]),
    VotantesHabilitados: getCell(row, [
      "VotantesHabilitados",
      "votantes_habilitados",
      "NroVotantes",
    ]),
  };
}

function mapTranscripcion(row) {
  return {
    CodigoActa: getCell(row, [
      "CodigoActa",
      "CodigoActa+R3I1:V125",
      "codigo_acta",
      "CODIGO_ACTA",
    ]),
    NroMesa: getCell(row, ["NroMesa", "nro_mesa", "Mesa"]),
    VotantesHabilitados: getCell(row, [
      "VotantesHabilitados",
      "votantes_habilitados",
      "NroVotantes",
    ]),
    PapeletasAnfora: getCell(row, [
      "PapeletasAnfora",
      "papeletas_anfora",
      "A",
    ]),
    PapeltasNoUtilizadas: getCell(row, [
      "PapeltasNoUtilizadas",
      "PapeletasNoUtilizadas",
      "papeletas_no_utilizadas",
      "papeletas_no_usadas",
      "S",
    ]),
    P1: getCell(row, ["P1", "p1"]),
    P2: getCell(row, ["P2", "p2"]),
    P3: getCell(row, ["P3", "p3"]),
    P4: getCell(row, ["P4", "p4"]),
    VotosValidos: getCell(row, ["VotosValidos", "votos_validos"]),
    VotosBlancos: getCell(row, ["VotosBlancos", "votos_blancos"]),
    VotosNulos: getCell(row, ["VotosNulos", "votos_nulos"]),
    Observaciones: getCell(row, [
      "Observaciones",
      "observaciones",
      "observacion",
    ]),
    AperturaHora: getCell(row, ["AperturaHora", "apertura_hora"]),
    AperturaMinutos: getCell(row, [
      "AperturaMinutos",
      "apertura_minutos",
    ]),
    CierreHora: getCell(row, ["CierreHora", "cierre_hora"]),
    CierreMinutos: getCell(row, ["CierreMinutos", "cierre_minutos"]),
  };
}

async function main() {
  console.log("Archivo Excel:");
  console.log(EXCEL_PATH);

  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`No existe el archivo Excel en la ruta: ${EXCEL_PATH}`);
  }

  const workbook = XLSX.read(fs.readFileSync(EXCEL_PATH), {
    type: "buffer",
  });

  console.log("\nHojas encontradas:");
  console.log(workbook.SheetNames);

  const territorios = readSheet(workbook, [
    "DistribucionTerritorial",
    "Distribucion Territorial",
    "Distribución Territorial",
    "distribucion territorial",
  ]);

  const recintos = readSheet(workbook, [
    "RecintosElectorales",
    "Recintos Electorales",
    "recintos electorales",
  ]);

  const mesas = readSheet(workbook, [
    "ActasImpresas",
    "Actas Impresas",
    "actas impresas",
  ]);

  const transcripciones = readSheet(workbook, [
    "Transcripciones",
    "transcripciones",
  ]);

  console.log("\nFilas detectadas por hoja:");
  console.log({
    territorios: territorios.totalRowsInSheet,
    recintos: recintos.totalRowsInSheet,
    mesas: mesas.totalRowsInSheet,
    transcripciones: transcripciones.totalRowsInSheet,
  });

  console.log("\nFilas que se procesarán:");
  console.log({
    territorios: territorios.rows.length,
    recintos: recintos.rows.length,
    mesas: mesas.rows.length,
    transcripciones: transcripciones.rows.length,
  });

  const options = new chrome.Options();

  options.addArguments("--disable-web-security");
  options.addArguments("--allow-running-insecure-content");
  options.addArguments("--disable-notifications");
  options.addArguments("--disable-gpu");
  options.addArguments("--disable-background-networking");
  options.addArguments("--disable-sync");
  options.addArguments("--disable-extensions");

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    await driver.manage().setTimeouts({
      script: 30000,
      pageLoad: 30000,
      implicit: 5000,
    });

    console.log("\nProbando conexión con backend...");
    await driver.get(`${BACKEND_URL}/health`);

    await importRows(
      driver,
      `Territorios (${territorios.sheetName})`,
      territorios.rows,
      `${BACKEND_URL}/api/import/territorio`,
      mapTerritorio
    );

    await importRows(
      driver,
      `Recintos (${recintos.sheetName})`,
      recintos.rows,
      `${BACKEND_URL}/api/import/recinto`,
      mapRecinto
    );

    await importRows(
      driver,
      `Mesas (${mesas.sheetName})`,
      mesas.rows,
      `${BACKEND_URL}/api/import/mesa`,
      mapMesa
    );

    await importRows(
      driver,
      `Transcripciones (${transcripciones.sheetName})`,
      transcripciones.rows,
      `${BACKEND_URL}/api/oficial/n8n/acta`,
      mapTranscripcion
    );

    console.log("\nProceso finalizado.");
    console.log(
      "Revisa Supabase: territorios, recintos, mesas, actas_oficiales, actas_observadas, votos_candidatos_oficial y logs_inconsistencias."
    );
  } catch (error) {
    console.error("\nError general:", error.message);
  } finally {
    await driver.quit();
  }
}

main();