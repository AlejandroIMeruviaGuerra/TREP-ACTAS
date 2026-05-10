const CAMPOS_OBLIGATORIOS = [
    "codigo_acta",
    "nro_mesa",
    "votantes_habilitados",
    "papeletas_anfora",
    "papeletas_no_utilizadas",
    "P1",
    "P2",
    "P3",
    "P4",
    "votos_validos",
    "votos_blancos",
    "votos_nulos",
    "apertura_hora",
    "apertura_minutos",
    "cierre_hora",
    "cierre_minutos",
];

const CAMPOS_NUMERICOS = [
    "votantes_habilitados",
    "papeletas_anfora",
    "papeletas_no_utilizadas",
    "P1",
    "P2",
    "P3",
    "P4",
    "votos_validos",
    "votos_blancos",
    "votos_nulos",
    "apertura_hora",
    "apertura_minutos",
    "cierre_hora",
    "cierre_minutos",
];

function validarCamposObligatorios(acta) {
    const errores = [];

    for (const campo of CAMPOS_OBLIGATORIOS) {
        if (acta[campo] === undefined || acta[campo] === null || acta[campo] === "") {
            errores.push(`Campo obligatorio vacío: ${campo}`);
        }
    }

    return errores;
}

function validarNumeros(acta) {
    const errores = [];

    for (const campo of CAMPOS_NUMERICOS) {
        const valor = acta[campo];

        if (typeof valor !== "number" || Number.isNaN(valor)) {
            errores.push(`Campo numérico inválido: ${campo}`);
            continue;
        }

        if (valor < 0) {
            errores.push(`Valor negativo no permitido en: ${campo}`);
        }
    }

    return errores;
}

function validarMatematicas(acta) {
    const errores = [];

    const sumaPartidos = acta.P1 + acta.P2 + acta.P3 + acta.P4;

    if (sumaPartidos !== acta.votos_validos) {
        errores.push(
            `Error suma partidos: P1+P2+P3+P4=${sumaPartidos}, votos_validos=${acta.votos_validos}`
        );
    }

    const sumaAnfora = acta.votos_validos + acta.votos_blancos + acta.votos_nulos;

    if (sumaAnfora !== acta.papeletas_anfora) {
        errores.push(
            `Error papeletas ánfora: validos+blancos+nulos=${sumaAnfora}, papeletas_anfora=${acta.papeletas_anfora}`
        );
    }

    const sumaHabilitados = acta.papeletas_anfora + acta.papeletas_no_utilizadas;

    if (sumaHabilitados !== acta.votantes_habilitados) {
        errores.push(
            `Error habilitados: anfora+no_utilizadas=${sumaHabilitados}, votantes_habilitados=${acta.votantes_habilitados}`
        );
    }

    return errores;
}

function validarHorario(acta) {
    const errores = [];

    if (acta.apertura_hora < 0 || acta.apertura_hora > 23) {
        errores.push("Hora de apertura inválida");
    }

    if (acta.cierre_hora < 0 || acta.cierre_hora > 23) {
        errores.push("Hora de cierre inválida");
    }

    if (acta.apertura_minutos < 0 || acta.apertura_minutos > 59) {
        errores.push("Minutos de apertura inválidos");
    }

    if (acta.cierre_minutos < 0 || acta.cierre_minutos > 59) {
        errores.push("Minutos de cierre inválidos");
    }

    const aperturaTotal = acta.apertura_hora * 60 + acta.apertura_minutos;
    const cierreTotal = acta.cierre_hora * 60 + acta.cierre_minutos;

    if (aperturaTotal >= cierreTotal) {
        errores.push("La apertura debe ser antes que el cierre");
    }

    return errores;
}

function sonActasIguales(a, b) {
    const campos = [
        "codigo_acta",
        "nro_mesa",
        "votantes_habilitados",
        "papeletas_anfora",
        "papeletas_no_utilizadas",
        "P1",
        "P2",
        "P3",
        "P4",
        "votos_validos",
        "votos_blancos",
        "votos_nulos",
        "apertura_hora",
        "apertura_minutos",
        "cierre_hora",
        "cierre_minutos",
    ];

    return campos.every((campo) => String(a[campo]) === String(b[campo]));
}

export async function registrarLogInconsistencia(db, {
    codigo_acta,
    tipo_error,
    detalle_error,
    datos_crudos,
}) {
    await db.collection("logs_inconsistencias").insertOne({
        codigo_acta: codigo_acta || null,
        tipo_error,
        detalle_error,
        datos_crudos,
        fecha_registro: new Date(),
    });
}

export async function validarYGuardarActaMongo(db, acta, datosCrudos = null) {
    const errores = [];

    errores.push(...validarCamposObligatorios(acta));

    if (errores.length === 0) {
        errores.push(...validarNumeros(acta));
        errores.push(...validarMatematicas(acta));
        errores.push(...validarHorario(acta));
    }

    const mesa = await db.collection("mesas").findOne({
        $or: [
            { codigo_acta: acta.codigo_acta },
            { mesa: String(acta.nro_mesa) },
            { codigo_mesa: Number(acta.nro_mesa) },
        ],
    });

    if (!mesa) {
        errores.push("Mesa no encontrada en padrón");
    }

    const duplicado = await db.collection("actas_trep").findOne({
        codigo_acta: acta.codigo_acta,
    });

    if (duplicado) {
        if (sonActasIguales(duplicado, acta)) {
            return {
                ok: true,
                action: "IGNORADO_DUPLICADO_EXACTO",
                message: "Acta duplicada exacta. No se inserta de nuevo.",
            };
        }

        await db.collection("actas_trep").deleteOne({
            codigo_acta: acta.codigo_acta,
        });

        await registrarLogInconsistencia(db, {
            codigo_acta: acta.codigo_acta,
            tipo_error: "DUPLICADO_ALTERADO",
            detalle_error: "Mismo código de acta con datos diferentes",
            datos_crudos: {
                anterior: duplicado,
                nuevo: acta,
            },
        });

        await db.collection("actas_observadas").insertOne({
            ...acta,
            estado_observacion: "PENDIENTE_REVISION",
            motivos: ["Duplicado con datos alterados"],
            datos_crudos: datosCrudos || acta,
            created_at: new Date(),
        });

        return {
            ok: false,
            action: "OBSERVADA_DUPLICADO_ALTERADO",
            message: "Acta enviada a observadas por duplicado alterado",
        };
    }

    if (acta.observaciones && String(acta.observaciones).trim() !== "") {
        errores.push("Acta con observación escrita");
    }

    if (errores.length > 0) {
        await registrarLogInconsistencia(db, {
            codigo_acta: acta.codigo_acta,
            tipo_error: "ACTA_INVALIDA",
            detalle_error: errores.join(" | "),
            datos_crudos: datosCrudos || acta,
        });

        await db.collection("actas_observadas").insertOne({
            ...acta,
            estado_observacion: "PENDIENTE_REVISION",
            motivos: errores,
            datos_crudos: datosCrudos || acta,
            created_at: new Date(),
        });

        return {
            ok: false,
            action: "OBSERVADA",
            message: "Acta enviada a observadas",
            errores,
        };
    }

    await db.collection("actas_trep").insertOne({
        ...acta,
        estado: "VALIDADA",
        mesa_info: mesa,
        created_at: new Date(),
    });

    return {
        ok: true,
        action: "INSERTADA",
        message: "Acta validada e insertada correctamente",
    };
}