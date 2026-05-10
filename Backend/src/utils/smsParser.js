function limpiarClave(clave = "") {
    return String(clave).trim().toUpperCase();
}

function limpiarValor(valor = "") {
    return String(valor).trim();
}

function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
}

export function parsearSMSActa(body = "") {
    const texto = String(body).trim();

    if (!texto) {
        return {
            ok: false,
            message: "El SMS está vacío",
            acta: null,
        };
    }

    const partes = texto.split(";").map((p) => p.trim()).filter(Boolean);
    const mapa = {};

    for (const parte of partes) {
        const [clave, ...resto] = parte.split(":");

        if (!clave || resto.length === 0) {
            return {
                ok: false,
                message: `Formato inválido en segmento: ${parte}`,
                acta: null,
            };
        }

        mapa[limpiarClave(clave)] = limpiarValor(resto.join(":"));
    }

    const acta = {
        codigo_acta: mapa.CODIGO_ACTA || mapa.ACTA || "",
        nro_mesa: mapa.NRO_MESA || mapa.MESA || "",
        votantes_habilitados: toNumber(mapa.VOTANTES_HABILITADOS || mapa.HAB),
        papeletas_anfora: toNumber(mapa.PAPELETAS_ANFORA || mapa.ANF),
        papeletas_no_utilizadas: toNumber(mapa.PAPELETAS_NO_UTILIZADAS || mapa.NO_UTILIZADAS || mapa.NOUT),
        P1: toNumber(mapa.P1),
        P2: toNumber(mapa.P2),
        P3: toNumber(mapa.P3),
        P4: toNumber(mapa.P4),
        votos_validos: toNumber(mapa.VOTOS_VALIDOS || mapa.VAL || mapa.VALIDOS),
        votos_blancos: toNumber(mapa.VOTOS_BLANCOS || mapa.BLA || mapa.BLANCOS),
        votos_nulos: toNumber(mapa.VOTOS_NULOS || mapa.NUL || mapa.NULOS),
        apertura_hora: toNumber(mapa.APERTURA_HORA || mapa.AH),
        apertura_minutos: toNumber(mapa.APERTURA_MINUTOS || mapa.AM),
        cierre_hora: toNumber(mapa.CIERRE_HORA || mapa.CH),
        cierre_minutos: toNumber(mapa.CIERRE_MINUTOS || mapa.CM),
        observaciones: mapa.OBSERVACIONES || mapa.OBS || "",
    };

    return {
        ok: true,
        message: "SMS parseado correctamente",
        acta,
    };
}