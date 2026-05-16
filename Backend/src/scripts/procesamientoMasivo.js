import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectMongo } from "../config/mongoClient.js"; // ✅ CAMBIO 1: Importamos connectMongo en lugar de getMongoDb
import { procesarImagenOCR } from "../services/ocr.service.js";
import { validarYGuardarActaMongo } from "../services/actaValidation.service.js";

// Configuración para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas absolutas
const DIR_ENTRADA = path.resolve(__dirname, "../../actas_entrada");
const DIR_COMPLETADOS = path.resolve(__dirname, "../../actas_completadas");
const DIR_ERROR = path.resolve(__dirname, "../../actas_error");

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function iniciarProcesamientoMasivo() {
  console.log("==========================================");
  console.log("🚀 INICIANDO PROCESAMIENTO MASIVO DE ACTAS");
  console.log("==========================================");

  const archivos = fs.readdirSync(DIR_ENTRADA).filter(f => f.toLowerCase().endsWith(".pdf") || f.toLowerCase().endsWith(".jpg"));
  
  if (archivos.length === 0) {
    console.log("📁 No hay actas para procesar en 'actas_entrada'.");
    process.exit(0);
  }

  console.log(`📊 Se encontraron ${archivos.length} actas. Conectando a MongoDB...\n`);

  // ✅ CAMBIO 2: Despertamos a Mongo directamente aquí
  const db = await connectMongo(); 
  if (!db) {
    console.error("❌ No se pudo conectar a MongoDB.");
    process.exit(1);
  }

  let exitosos = 0;
  let fallidos = 0;

  for (let i = 0; i < archivos.length; i++) {
    const nombreArchivo = archivos[i];
    const rutaArchivo = path.join(DIR_ENTRADA, nombreArchivo);
    
    console.log(`\n⏳ [${i + 1}/${archivos.length}] Procesando: ${nombreArchivo}...`);

    try {
      const fileBuffer = fs.readFileSync(rutaArchivo);
      const stats = fs.statSync(rutaArchivo);

      // Llamamos al motor OCR
      const datosExtraidos = await procesarImagenOCR(fileBuffer, nombreArchivo);

      // Adaptador de la estructura de Python a tu BD
      if (datosExtraidos && datosExtraidos.votos && datosExtraidos.totales) {
        datosExtraidos.P1 = datosExtraidos.votos.P1;
        datosExtraidos.P2 = datosExtraidos.votos.P2;
        datosExtraidos.P3 = datosExtraidos.votos.P3;
        datosExtraidos.P4 = datosExtraidos.votos.P4;
        datosExtraidos.votos_validos = datosExtraidos.totales.validos;
        datosExtraidos.votos_blancos = datosExtraidos.totales.blancos;
        datosExtraidos.votos_nulos = datosExtraidos.totales.nulos;
      }

      const votosValidos = toNumber(datosExtraidos.votos_validos) || 
        (toNumber(datosExtraidos.P1) + toNumber(datosExtraidos.P2) + toNumber(datosExtraidos.P3) + toNumber(datosExtraidos.P4));
      const papeletasAnfora = votosValidos + toNumber(datosExtraidos.votos_blancos) + toNumber(datosExtraidos.votos_nulos);

      const actaCompleta = {
        ...datosExtraidos,
        codigo_acta: toNumber(datosExtraidos.codigo_acta || 0),
        votos_validos: votosValidos,
        papeletas_anfora: papeletasAnfora,
        papeletas_no_utilizadas: 62,
        estado: "PENDIENTE_REVISION",
        canal_ingreso: "LOTE_MASIVO",
        usuario: "admin_lotes",
        fecha_registro: new Date(),
        created_at: new Date()
      };

      // Guardamos en actas_ocr
      await db.collection("actas_ocr").insertOne({
        ...actaCompleta,
        nombre_archivo: nombreArchivo,
        tamanio_archivo: stats.size,
        datos_crudos_ocr: datosExtraidos,
      });

      // Validamos y guardamos (tu lógica de negocio)
      await validarYGuardarActaMongo(db, actaCompleta, {
        nombre_archivo: nombreArchivo,
        tamanio: stats.size,
        usuario: "admin_lotes",
      });

      // Movemos el archivo a la carpeta de ÉXITO
      fs.renameSync(rutaArchivo, path.join(DIR_COMPLETADOS, nombreArchivo));
      console.log(`✅ ¡Éxito! Acta guardada en base de datos.`);
      exitosos++;

    } catch (error) {
      console.error(`❌ Error leyendo ${nombreArchivo}:`, error.message);
      // Movemos el archivo a la carpeta de ERROR
      fs.renameSync(rutaArchivo, path.join(DIR_ERROR, nombreArchivo));
      fallidos++;
    }
  }

  console.log("\n==========================================");
  console.log("🏁 PROCESAMIENTO MASIVO FINALIZADO");
  console.log(`✅ Exitosos: ${exitosos}`);
  console.log(`❌ Fallidos: ${fallidos}`);
  console.log("==========================================");
  process.exit(0); 
}

iniciarProcesamientoMasivo();