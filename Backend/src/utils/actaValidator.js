export function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return null;
}

export function getByPossibleKeys(raw, possibleKeys) {
  for (const key of possibleKeys) {
    if (raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== "") {
      return raw[key];
    }
  }

  const normalizedMap = new Map();

  for (const key of Object.keys(raw)) {
    const normalized = String(key)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    normalizedMap.set(normalized, raw[key]);
  }

  for (const key of possibleKeys) {
    const normalizedWanted = String(key)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");

    for (const [normalizedKey, value] of normalizedMap.entries()) {
      if (
        normalizedKey === normalizedWanted ||
        normalizedKey.startsWith(normalizedWanted)
      ) {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          return value;
        }
      }
    }
  }

  return null;
}

export function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const cleaned = String(value)
    .trim()
    .replace(",", ".")
    .replace(/\s/g, "");

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
}

function isMissing(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

export function normalizeActaPayload(raw) {
  const codigoActaRaw = getByPossibleKeys(raw, [
    "codigo_acta",
    "CodigoActa",
    "CODIGO_ACTA",
    "CodigoActa+R3I1:V125",
    "codigo_mesa",
    "CodigoMesa",
    "MESA",
  ]);

  const nroMesaRaw = getByPossibleKeys(raw, [
    "nro_mesa",
    "NroMesa",
    "Mesa",
  ]);

  const votantesHabilitadosRaw = getByPossibleKeys(raw, [
    "votantes_habilitados",
    "VotantesHabilitados",
    "NroVotantes",
  ]);

  const papeletasAnforaRaw = getByPossibleKeys(raw, [
    "papeletas_anfora",
    "PapeletasAnfora",
    "A",
    "anfora",
  ]);

  const papeletasNoUtilizadasRaw = getByPossibleKeys(raw, [
    "papeletas_no_utilizadas",
    "PapeletasNoUtilizadas",
    "PapeltasNoUtilizadas",
    "papeletas_no_usadas",
    "S",
    "sobrantes",
  ]);

  const p1Raw = getByPossibleKeys(raw, ["p1", "P1", "primer_partido"]);
  const p2Raw = getByPossibleKeys(raw, ["p2", "P2", "segundo_partido"]);
  const p3Raw = getByPossibleKeys(raw, ["p3", "P3", "tercer_partido"]);
  const p4Raw = getByPossibleKeys(raw, ["p4", "P4", "cuarto_partido"]);

  const blancosRaw = getByPossibleKeys(raw, [
    "votos_blancos",
    "VotosBlancos",
    "B",
  ]);

  const nulosRaw = getByPossibleKeys(raw, [
    "votos_nulos",
    "VotosNulos",
    "N",
  ]);

  const votosValidosRaw = getByPossibleKeys(raw, [
    "votos_validos",
    "VotosValidos",
  ]);

  const aperturaHoraRaw = getByPossibleKeys(raw, [
    "AperturaHora",
    "apertura_hora",
  ]);

  const aperturaMinutosRaw = getByPossibleKeys(raw, [
    "AperturaMinutos",
    "apertura_minutos",
  ]);

  const cierreHoraRaw = getByPossibleKeys(raw, [
    "CierreHora",
    "cierre_hora",
  ]);

  const cierreMinutosRaw = getByPossibleKeys(raw, [
    "CierreMinutos",
    "cierre_minutos",
  ]);

  const observacionesRaw = getByPossibleKeys(raw, [
    "Observaciones",
    "observaciones",
    "observacion",
  ]);

  const missingFields = [];

  const requiredFields = [
    ["CodigoActa", codigoActaRaw],
    ["NroMesa", nroMesaRaw],
    ["VotantesHabilitados", votantesHabilitadosRaw],
    ["PapeletasAnfora", papeletasAnforaRaw],
    ["PapeltasNoUtilizadas", papeletasNoUtilizadasRaw],
    ["P1", p1Raw],
    ["P2", p2Raw],
    ["P3", p3Raw],
    ["P4", p4Raw],
    ["VotosValidos", votosValidosRaw],
    ["VotosBlancos", blancosRaw],
    ["VotosNulos", nulosRaw],
    ["AperturaHora", aperturaHoraRaw],
    ["AperturaMinutos", aperturaMinutosRaw],
    ["CierreHora", cierreHoraRaw],
    ["CierreMinutos", cierreMinutosRaw],
  ];

  for (const [field, value] of requiredFields) {
    if (isMissing(value)) {
      missingFields.push(field);
    }
  }

  const p1 = toNumber(p1Raw);
  const p2 = toNumber(p2Raw);
  const p3 = toNumber(p3Raw);
  const p4 = toNumber(p4Raw);

  const votosBlancos = toNumber(blancosRaw);
  const votosNulos = toNumber(nulosRaw);

  const votosValidos = !isMissing(votosValidosRaw)
    ? toNumber(votosValidosRaw)
    : p1 + p2 + p3 + p4;

  return {
    codigo_acta: Number(codigoActaRaw),
    nro_mesa: !isMissing(nroMesaRaw) ? toNumber(nroMesaRaw) : null,
    votantes_habilitados_archivo: !isMissing(votantesHabilitadosRaw)
      ? toNumber(votantesHabilitadosRaw)
      : null,

    papeletas_anfora: toNumber(papeletasAnforaRaw),
    papeletas_no_utilizadas: toNumber(papeletasNoUtilizadasRaw),

    votos_validos: votosValidos,
    votos_blancos: votosBlancos,
    votos_nulos: votosNulos,

    apertura_hora: !isMissing(aperturaHoraRaw) ? toNumber(aperturaHoraRaw) : null,
    apertura_minutos: !isMissing(aperturaMinutosRaw)
      ? toNumber(aperturaMinutosRaw)
      : null,

    cierre_hora: !isMissing(cierreHoraRaw) ? toNumber(cierreHoraRaw) : null,
    cierre_minutos: !isMissing(cierreMinutosRaw)
      ? toNumber(cierreMinutosRaw)
      : null,

    observaciones: observacionesRaw ?? null,

    candidatos: [
      { candidato: "P1", votos: p1 },
      { candidato: "P2", votos: p2 },
      { candidato: "P3", votos: p3 },
      { candidato: "P4", votos: p4 },
    ],

    missingFields,
  };
}

export function validateActa(acta, mesa) {
  const errors = [];

  if (acta.missingFields && acta.missingFields.length > 0) {
    errors.push(
      `Faltan campos obligatorios: ${acta.missingFields.join(", ")}.`
    );
  }

  if (!acta.codigo_acta || Number.isNaN(acta.codigo_acta)) {
    errors.push("El código de acta es obligatorio o inválido.");
  }

  if (!mesa) {
    errors.push("La mesa no existe en la tabla mesas.");
    return errors;
  }

  if (
    acta.nro_mesa !== null &&
    Number(mesa.nro_mesa) !== Number(acta.nro_mesa)
  ) {
    errors.push(
      "El número de mesa de la transcripción no coincide con la tabla mesas."
    );
  }

  if (
    acta.votantes_habilitados_archivo !== null &&
    Number(mesa.votantes_habilitados) !==
      Number(acta.votantes_habilitados_archivo)
  ) {
    errors.push(
      "Los votantes habilitados de la transcripción no coinciden con la tabla mesas."
    );
  }

  const numericFields = [
    "papeletas_anfora",
    "papeletas_no_utilizadas",
    "votos_validos",
    "votos_blancos",
    "votos_nulos",
  ];

  for (const field of numericFields) {
    if (acta[field] < 0) {
      errors.push(`El campo ${field} no puede ser negativo.`);
    }
  }

  for (const candidato of acta.candidatos) {
    if (candidato.votos < 0) {
      errors.push(`Los votos de ${candidato.candidato} no pueden ser negativos.`);
    }
  }

  if (
    acta.papeletas_anfora + acta.papeletas_no_utilizadas !==
    Number(mesa.votantes_habilitados)
  ) {
    errors.push(
      "Papeletas en ánfora + papeletas no utilizadas no coincide con votantes habilitados."
    );
  }

  const sumaCandidatos = acta.candidatos.reduce(
    (total, item) => total + Number(item.votos),
    0
  );

  if (sumaCandidatos !== acta.votos_validos) {
    errors.push(
      "La suma de votos por candidatos no coincide con votos válidos."
    );
  }

  if (
    acta.votos_validos + acta.votos_blancos + acta.votos_nulos !==
    acta.papeletas_anfora
  ) {
    errors.push(
      "Votos válidos + votos blancos + votos nulos no coincide con papeletas en ánfora."
    );
  }

  return errors;
}

export function sameActaData(existingActa, newActa, existingVotes) {
  const sameBase =
    Number(existingActa.papeletas_anfora) === Number(newActa.papeletas_anfora) &&
    Number(existingActa.papeletas_no_utilizadas) ===
      Number(newActa.papeletas_no_utilizadas) &&
    Number(existingActa.votos_validos) === Number(newActa.votos_validos) &&
    Number(existingActa.votos_blancos) === Number(newActa.votos_blancos) &&
    Number(existingActa.votos_nulos) === Number(newActa.votos_nulos);

  const existingVotesMap = new Map();

  for (const vote of existingVotes || []) {
    existingVotesMap.set(vote.candidato, Number(vote.votos));
  }

  const sameCandidates = newActa.candidatos.every((candidate) => {
    return existingVotesMap.get(candidate.candidato) === Number(candidate.votos);
  });

  return sameBase && sameCandidates;
}