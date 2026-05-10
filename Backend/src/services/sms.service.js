import { getMongoDb } from "../config/mongoClient.js";
import { parsearSMSActa } from "../utils/smsParser.js";
import { validarYGuardarActaMongo } from "./actaValidation.service.js";

const JURADOS_COLLECTION = "jurados_autorizados";
const SMS_COLLECTION = "sms_recibidos";

function normalizarNumero(numero = "") {
    return String(numero).replace(/[^\d+]/g, "").trim();
}

function extraerUltimosDigitos(numero = "", cantidad = 8) {
    const soloDigitos = String(numero).replace(/\D/g, "");
    return soloDigitos.slice(-cantidad);
}

async function buscarJuradoAutorizado(db, fromNumber) {
    const numeroNormalizado = normalizarNumero(fromNumber);
    const ultimos = extraerUltimosDigitos(numeroNormalizado, 8);

    const jurados = await db
        .collection(JURADOS_COLLECTION)
        .find({
            activo: true,
            rol: "jurado",
        })
        .toArray();

    const jurado = jurados.find((j) => {
        const numeroBD = normalizarNumero(j.numero_celular || "");

        return (
            numeroBD === numeroNormalizado ||
            extraerUltimosDigitos(numeroBD, 8) === ultimos
        );
    });

    return jurado || null;
}

async function guardarSMS({
    db,
    fromNumber,
    toNumber,
    body,
    messageSid,
    autorizado,
    jurado,
    payloadCompleto,
    estado,
    observacion,
}) {
    const registro = {
        from_number: fromNumber,
        to_number: toNumber,
        body,
        message_sid: messageSid,
        is_authorized: autorizado,
        estado,
        observacion: observacion || "",
        jurado_id: jurado?._id ? String(jurado._id) : "",
        jurado_nombre: jurado?.nombre || "",
        raw_payload: payloadCompleto || {},
        created_at: new Date(),
    };

    const result = await db.collection(SMS_COLLECTION).insertOne(registro);

    return {
        ok: true,
        insertedId: result.insertedId,
        registro,
    };
}

export async function procesarSMSRecibido(payload) {
    const db = getMongoDb();

    const fromNumber = normalizarNumero(payload.From || payload.from || "");
    const toNumber = normalizarNumero(payload.To || payload.to || "");
    const body = String(payload.Body || payload.body || "").trim();
    const messageSid = String(payload.MessageSid || payload.messageSid || "");

    if (!fromNumber || !body) {
        await guardarSMS({
            db,
            fromNumber: fromNumber || "DESCONOCIDO",
            toNumber,
            body: body || "SIN_CONTENIDO",
            messageSid,
            autorizado: false,
            jurado: null,
            payloadCompleto: payload,
            estado: "ERROR",
            observacion: "SMS inválido: faltan datos básicos",
        });

        return {
            ok: false,
            message: "SMS inválido: faltan datos básicos",
        };
    }

    const jurado = await buscarJuradoAutorizado(db, fromNumber);

    if (!jurado) {
        await guardarSMS({
            db,
            fromNumber,
            toNumber,
            body,
            messageSid,
            autorizado: false,
            jurado: null,
            payloadCompleto: payload,
            estado: "RECHAZADO",
            observacion: "Número no autorizado",
        });

        return {
            ok: false,
            message: "Número no autorizado",
        };
    }

    const parseo = parsearSMSActa(body);

    if (!parseo.ok) {
        await guardarSMS({
            db,
            fromNumber,
            toNumber,
            body,
            messageSid,
            autorizado: true,
            jurado,
            payloadCompleto: payload,
            estado: "ERROR",
            observacion: parseo.message,
        });

        return {
            ok: false,
            message: parseo.message,
        };
    }

    const resultadoActa = await validarYGuardarActaMongo(db, parseo.acta, {
        sms_payload: payload,
        jurado,
    });

    if (!resultadoActa.ok) {
        await guardarSMS({
            db,
            fromNumber,
            toNumber,
            body,
            messageSid,
            autorizado: true,
            jurado,
            payloadCompleto: payload,
            estado: "ERROR",
            observacion: resultadoActa.message,
        });

        return {
            ok: false,
            message: resultadoActa.message,
            detalle: resultadoActa,
        };
    }

    await guardarSMS({
        db,
        fromNumber,
        toNumber,
        body,
        messageSid,
        autorizado: true,
        jurado,
        payloadCompleto: payload,
        estado: "PROCESADO",
        observacion: resultadoActa.message,
    });

    return {
        ok: true,
        message: "SMS procesado correctamente",
        jurado: {
            nombre: jurado.nombre,
            mesa: jurado.mesa,
            recinto: jurado.recinto,
        },
        resultadoActa,
    };
}