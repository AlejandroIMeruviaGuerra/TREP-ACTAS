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

function normalizarTexto(value = "") {
    return String(value)
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function normalizarDepartamento(value = "") {
    const dep = normalizarTexto(value);

    const mapa = {
        // Por número
        "1": { codigo: "CHQ", nombre: "Chuquisaca" },
        "2": { codigo: "LPZ", nombre: "La Paz" },
        "3": { codigo: "CBBA", nombre: "Cochabamba" },
        "4": { codigo: "ORU", nombre: "Oruro" },
        "5": { codigo: "PTS", nombre: "Potosí" },
        "6": { codigo: "TJA", nombre: "Tarija" },
        "7": { codigo: "SCZ", nombre: "Santa Cruz" },
        "8": { codigo: "BEN", nombre: "Beni" },
        "9": { codigo: "PDO", nombre: "Pando" },

        // Abreviados
        CHQ: { codigo: "CHQ", nombre: "Chuquisaca" },
        LPZ: { codigo: "LPZ", nombre: "La Paz" },
        CBBA: { codigo: "CBBA", nombre: "Cochabamba" },
        CBB: { codigo: "CBBA", nombre: "Cochabamba" },
        COCHABAMBA: { codigo: "CBBA", nombre: "Cochabamba" },
        ORU: { codigo: "ORU", nombre: "Oruro" },
        PTS: { codigo: "PTS", nombre: "Potosí" },
        POTOSI: { codigo: "PTS", nombre: "Potosí" },
        TJA: { codigo: "TJA", nombre: "Tarija" },
        SCZ: { codigo: "SCZ", nombre: "Santa Cruz" },
        SC: { codigo: "SCZ", nombre: "Santa Cruz" },
        SANTACRUZ: { codigo: "SCZ", nombre: "Santa Cruz" },
        BEN: { codigo: "BEN", nombre: "Beni" },
        PDO: { codigo: "PDO", nombre: "Pando" },
        PANDO: { codigo: "PDO", nombre: "Pando" },
    };

    return mapa[dep] || {
        codigo: dep || "",
        nombre: value || "",
    };
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

    const depRaw = mapa.DEP || mapa.DEPARTAMENTO || mapa.DPT || "";

    if (!depRaw) {
        return {
            ok: false,
            message: "Campo obligatorio vacío: DEP",
            acta: null,
        };
    }

    const dep = normalizarDepartamento(depRaw);

    const acta = {
        departamento_codigo: dep.codigo,
        departamento: dep.nombre,
        departamento_raw: depRaw,

        codigo_acta: mapa.CODIGO_ACTA || mapa.ACTA || "",
        nro_mesa: mapa.NRO_MESA || mapa.MESA || "",

        provincia: mapa.PROVINCIA || mapa.PROV || "",
        municipio: mapa.MUNICIPIO || mapa.MUN || "",
        recinto: mapa.RECINTO || mapa.REC || "",

        votantes_habilitados: toNumber(mapa.VOTANTES_HABILITADOS || mapa.HAB),
        papeletas_anfora: toNumber(mapa.PAPELETAS_ANFORA || mapa.ANF),
        papeletas_no_utilizadas: toNumber(
            mapa.PAPELETAS_NO_UTILIZADAS || mapa.NO_UTILIZADAS || mapa.NOUT
        ),

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