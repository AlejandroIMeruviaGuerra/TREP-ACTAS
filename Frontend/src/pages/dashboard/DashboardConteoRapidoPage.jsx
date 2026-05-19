import { useEffect, useMemo, useState } from "react";
import {
  getResumenConteoRapido,
  getActasOCR,
  getActasPreliminares,
  getActasTREP,
  getSMSRecibidos,
  getEstadisticasConteo,
} from "../../services/conteoRapidoService";
import "./DashboardConteoRapido.css";

const partyConfig = {
  P1: { label: "P1", name: "P1 Rojo", colorClass: "party-p1" },
  P2: { label: "P2", name: "P2 Azul", colorClass: "party-p2" },
  P3: { label: "P3", name: "P3 Verde", colorClass: "party-p3" },
  P4: { label: "P4", name: "P4 Amarillo", colorClass: "party-p4" },
};

const DEPARTAMENTOS_BOLIVIA = [
  "Chuquisaca",
  "La Paz",
  "Cochabamba",
  "Oruro",
  "Potosí",
  "Tarija",
  "Santa Cruz",
  "Beni",
  "Pando",
];

function toArray(value) {
  const raw = value?.data ?? value;

  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.actas)) return raw.actas;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.docs)) return raw.docs;
  if (Array.isArray(raw?.result)) return raw.result;

  return [];
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeDepartment(value) {
  const text = normalizeText(value);

  const map = {
    "1": "Chuquisaca",
    "2": "La Paz",
    "3": "Cochabamba",
    "4": "Oruro",
    "5": "Potosí",
    "6": "Tarija",
    "7": "Santa Cruz",
    "8": "Beni",
    "9": "Pando",

    chq: "Chuquisaca",
    chuquisaca: "Chuquisaca",

    lpz: "La Paz",
    lapaz: "La Paz",
    "la paz": "La Paz",

    cbba: "Cochabamba",
    cbb: "Cochabamba",
    cochabamba: "Cochabamba",

    oru: "Oruro",
    oruro: "Oruro",

    pts: "Potosí",
    potosi: "Potosí",
    potosí: "Potosí",

    tja: "Tarija",
    tarija: "Tarija",

    scz: "Santa Cruz",
    sc: "Santa Cruz",
    santacruz: "Santa Cruz",
    "santa cruz": "Santa Cruz",

    ben: "Beni",
    beni: "Beni",

    pdo: "Pando",
    pando: "Pando",
  };

  return map[text] || value || "Sin departamento";
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("es-BO");
}

function getDateValue(value) {
  if (!value) return null;

  if (typeof value === "object" && value.$date) {
    return value.$date;
  }

  return value;
}

function formatDate(value) {
  const cleanValue = getDateValue(value);

  if (!cleanValue) return "Sin fecha";

  const date = new Date(cleanValue);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return date.toLocaleString("es-BO");
}

function parseSMSBody(body = "") {
  const text = String(body || "").trim();
  const data = {};

  if (!text) return data;

  text
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [key, ...rest] = part.split(":");

      if (!key || rest.length === 0) return;

      data[String(key).trim().toUpperCase()] = rest.join(":").trim();
    });

  return data;
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function getActaDepartamento(acta) {
  const sms = parseSMSBody(acta?.body || acta?.raw_payload?.Body || "");

  return normalizeDepartment(
    firstValue(
      acta?.departamento,
      acta?.departamento_codigo,
      acta?.dep,
      acta?.DEP,
      acta?.mesa_info?.departamento,
      acta?.mesa_info?.departamento_codigo,
      acta?.mesa_info?.dep,
      sms.DEP,
      sms.DEPARTAMENTO,
      sms.DPT
    )
  );
}

function getActaProvincia(acta) {
  const sms = parseSMSBody(acta?.body || acta?.raw_payload?.Body || "");

  return firstValue(
    acta?.provincia,
    acta?.mesa_info?.provincia,
    acta?.mesa_info?.provincia_nombre,
    sms.PROV,
    sms.PROVINCIA,
    "Sin provincia"
  );
}

function getActaMunicipio(acta) {
  const sms = parseSMSBody(acta?.body || acta?.raw_payload?.Body || "");

  return firstValue(
    acta?.municipio,
    acta?.mesa_info?.municipio,
    acta?.mesa_info?.municipio_nombre,
    sms.MUN,
    sms.MUNICIPIO,
    "Sin municipio"
  );
}

function getActaRecinto(acta) {
  const sms = parseSMSBody(acta?.body || acta?.raw_payload?.Body || "");

  return firstValue(
    acta?.recinto,
    acta?.mesa_info?.recinto,
    acta?.mesa_info?.recinto_nombre,
    sms.REC,
    sms.RECINTO,
    "Sin recinto"
  );
}

function getActaCodigo(acta, index = 0) {
  const sms = parseSMSBody(acta?.body || acta?.raw_payload?.Body || "");

  return String(
    firstValue(
      acta?.codigo_acta,
      acta?.codigo_mesa,
      acta?.id,
      sms.ACTA,
      sms.CODIGO_ACTA,
      `ACTA-${index}`
    )
  );
}

function getActaVotes(acta) {
  const sms = parseSMSBody(acta?.body || acta?.raw_payload?.Body || "");

  return {
    P1: toNumber(firstValue(acta?.P1, acta?.p1, acta?.candidato_1, sms.P1)),
    P2: toNumber(firstValue(acta?.P2, acta?.p2, acta?.candidato_2, sms.P2)),
    P3: toNumber(firstValue(acta?.P3, acta?.p3, acta?.candidato_3, sms.P3)),
    P4: toNumber(firstValue(acta?.P4, acta?.p4, acta?.candidato_4, sms.P4)),
  };
}

function isActaContable(acta) {
  if (acta?.conteo_valido === true) return true;
  if (acta?.estado === "VALIDADA") return true;
  if (acta?.estado === "PROCESADO") return true;

  return false;
}

function normalizeActaForConteo(acta, fuente, index) {
  const votes = getActaVotes(acta);
  const departamento = getActaDepartamento(acta);

  return {
    ...acta,
    codigo_acta: getActaCodigo(acta, index),
    departamento,
    municipio: getActaMunicipio(acta),
    provincia: getActaProvincia(acta),
    recinto: getActaRecinto(acta),
    P1: votes.P1,
    P2: votes.P2,
    P3: votes.P3,
    P4: votes.P4,
    conteo_valido: isActaContable(acta),
    fuente_conteo: fuente || acta?.fuente_conteo || "DESCONOCIDA",
  };
}

function getPartyRanking(totals) {
  return [
    { party: "P1", votes: toNumber(totals.P1), colorClass: "party-p1" },
    { party: "P2", votes: toNumber(totals.P2), colorClass: "party-p2" },
    { party: "P3", votes: toNumber(totals.P3), colorClass: "party-p3" },
    { party: "P4", votes: toNumber(totals.P4), colorClass: "party-p4" },
  ].sort((a, b) => b.votes - a.votes);
}

function getWinner(totals) {
  const ranking = getPartyRanking(totals);

  if (!ranking.length || ranking[0].votes <= 0) {
    return null;
  }

  return ranking[0].party;
}

function buildDepartamentosFromActas(actas) {
  const map = new Map();

  DEPARTAMENTOS_BOLIVIA.forEach((departamento) => {
    map.set(departamento, {
      departamento,
      actas: 0,
      P1: 0,
      P2: 0,
      P3: 0,
      P4: 0,
      total_votos: 0,
      ganador: null,
    });
  });

  actas.forEach((acta) => {
    if (!acta.conteo_valido) return;
    if (!DEPARTAMENTOS_BOLIVIA.includes(acta.departamento)) return;

    const item = map.get(acta.departamento);

    item.actas += 1;
    item.P1 += toNumber(acta.P1);
    item.P2 += toNumber(acta.P2);
    item.P3 += toNumber(acta.P3);
    item.P4 += toNumber(acta.P4);
  });

  return Array.from(map.values()).map((item) => {
    item.total_votos = item.P1 + item.P2 + item.P3 + item.P4;
    item.ganador = getWinner(item);

    return item;
  });
}

function buildUbicacionesFromActas(actas) {
  const map = new Map();

  actas.forEach((acta) => {
    if (!acta.conteo_valido) return;
    if (!DEPARTAMENTOS_BOLIVIA.includes(acta.departamento)) return;

    const key = [
      acta.departamento,
      acta.municipio,
      acta.provincia,
      acta.recinto,
    ].join("|");

    if (!map.has(key)) {
      map.set(key, {
        departamento: acta.departamento,
        municipio: acta.municipio || "Sin municipio",
        provincia: acta.provincia || "Sin provincia",
        recinto: acta.recinto || "Sin recinto",
        actas: 0,
        P1: 0,
        P2: 0,
        P3: 0,
        P4: 0,
        total_votos: 0,
        ganador: null,
      });
    }

    const item = map.get(key);

    item.actas += 1;
    item.P1 += toNumber(acta.P1);
    item.P2 += toNumber(acta.P2);
    item.P3 += toNumber(acta.P3);
    item.P4 += toNumber(acta.P4);
  });

  return Array.from(map.values())
    .map((item) => {
      item.total_votos = item.P1 + item.P2 + item.P3 + item.P4;
      item.ganador = getWinner(item);

      return item;
    })
    .sort((a, b) => b.total_votos - a.total_votos);
}

function DashboardConteoRapidoPage() {
  const [resumen, setResumen] = useState(null);
  const [actasOCR, setActasOCR] = useState([]);
  const [actasPreliminares, setActasPreliminares] = useState([]);
  const [actasTREP, setActasTREP] = useState([]);
  const [smsRecibidos, setSmsRecibidos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadConteoRapido() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        resumenResp,
        actasOCRResp,
        actasPreliminaresResp,
        actasTREPResp,
        smsResp,
        estadisticasResp,
      ] = await Promise.all([
        getResumenConteoRapido(),
        getActasOCR(),
        getActasPreliminares(),
        getActasTREP(),
        getSMSRecibidos(),
        getEstadisticasConteo(),
      ]);

      if (!resumenResp.ok) throw new Error(resumenResp.message);
      if (!actasOCRResp.ok) throw new Error(actasOCRResp.message);
      if (!actasPreliminaresResp.ok) {
        throw new Error(actasPreliminaresResp.message);
      }
      if (!actasTREPResp.ok) throw new Error(actasTREPResp.message);
      if (!smsResp.ok) throw new Error(smsResp.message);
      if (!estadisticasResp.ok) throw new Error(estadisticasResp.message);

      setResumen(resumenResp.data || {});
      setActasOCR(toArray(actasOCRResp));
      setActasPreliminares(toArray(actasPreliminaresResp));
      setActasTREP(toArray(actasTREPResp));
      setSmsRecibidos(toArray(smsResp));
      setEstadisticas(estadisticasResp.data || {});
    } catch (error) {
      setErrorMessage(error.message || "Error cargando el conteo rápido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConteoRapido();
  }, []);

  const normalizedOCR = useMemo(() => {
    return actasOCR.map((acta, index) =>
      normalizeActaForConteo(acta, "OCR", index)
    );
  }, [actasOCR]);

  const normalizedPreliminares = useMemo(() => {
    return actasPreliminares.map((acta, index) =>
      normalizeActaForConteo(acta, "PRELIMINAR", index)
    );
  }, [actasPreliminares]);

  const normalizedSMS = useMemo(() => {
    return smsRecibidos.map((sms, index) =>
      normalizeActaForConteo(sms, "SMS", index)
    );
  }, [smsRecibidos]);

  const normalizedTREP = useMemo(() => {
    return actasTREP.map((acta, index) =>
      normalizeActaForConteo(acta, "TREP", index)
    );
  }, [actasTREP]);

  const baseConteo = useMemo(() => {
    const all = [
      ...normalizedOCR,
      ...normalizedPreliminares,
      ...normalizedSMS,
      ...normalizedTREP,
    ];

    const map = new Map();

    all.forEach((acta, index) => {
      const key = String(acta.codigo_acta || `ACTA-${index}`);

      if (!map.has(key)) {
        map.set(key, acta);
        return;
      }

      const old = map.get(key);

      map.set(key, {
        ...old,
        ...acta,
        fuentes_conteo: Array.from(
          new Set(
            [
              ...(old.fuentes_conteo || [old.fuente_conteo]),
              ...(acta.fuentes_conteo || [acta.fuente_conteo]),
            ].filter(Boolean)
          )
        ),
      });
    });

    return Array.from(map.values());
  }, [normalizedOCR, normalizedPreliminares, normalizedSMS, normalizedTREP]);

  const baseContable = useMemo(() => {
    return baseConteo.filter(
      (acta) =>
        acta.conteo_valido === true &&
        DEPARTAMENTOS_BOLIVIA.includes(acta.departamento)
    );
  }, [baseConteo]);

  const departamentosResumen = useMemo(() => {
    return buildDepartamentosFromActas(baseContable);
  }, [baseContable]);

  const ubicacionesResumen = useMemo(() => {
    return buildUbicacionesFromActas(baseContable);
  }, [baseContable]);

  const votosPorCandidato = useMemo(() => {
    const totals = {
      P1: 0,
      P2: 0,
      P3: 0,
      P4: 0,
    };

    baseContable.forEach((acta) => {
      totals.P1 += toNumber(acta.P1);
      totals.P2 += toNumber(acta.P2);
      totals.P3 += toNumber(acta.P3);
      totals.P4 += toNumber(acta.P4);
    });

    return getPartyRanking(totals).map((item) => ({
      candidato: item.party,
      votos: item.votes,
      colorClass: item.colorClass,
    }));
  }, [baseContable]);

  const totalVotos = useMemo(() => {
    return votosPorCandidato.reduce((acc, curr) => acc + curr.votos, 0);
  }, [votosPorCandidato]);

  const actasOCRPorEstado = useMemo(() => {
    const estados = {};

    actasOCR.forEach((acta) => {
      const estado = acta.estado || acta.validacion?.estado || "DESCONOCIDO";
      estados[estado] = (estados[estado] || 0) + 1;
    });

    return estados;
  }, [actasOCR]);

  const inconsistenciasRapidas = useMemo(() => {
    const value = estadisticas?.inconsistencias_tipo;

    if (!Array.isArray(value)) return [];

    return value.slice(0, 4);
  }, [estadisticas]);

  const totalNoContadas = useMemo(() => {
    return baseConteo.filter(
      (acta) =>
        acta.conteo_valido === true &&
        !DEPARTAMENTOS_BOLIVIA.includes(acta.departamento)
    ).length;
  }, [baseConteo]);

  if (loading) {
    return (
      <div className="dbcr-root">
        <div className="dbcr-loading-box">
          <div className="dbcr-loading-spinner" />
          <span>Cargando datos de conteo rápido...</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="dbcr-root">
        <div className="dbcr-error-box">{errorMessage}</div>
      </div>
    );
  }

  return (
    <div className="dbcr-root">
      <header className="dbcr-header">
        <div>
          <h2 className="dbcr-page-title">Conteo Rápido - TREP</h2>
          <p className="dbcr-page-description">
            Conteo preliminar consolidado desde TREP, SMS, OCR y actas
            preliminares. Solo se cuentan actas cuyo departamento coincide con
            uno de los 9 departamentos de Bolivia.
          </p>
        </div>

        <button className="dbcr-refresh-btn" onClick={loadConteoRapido}>
          Actualizar
        </button>
      </header>

      <div className="dbcr-kpi-grid">
        <div className="dbcr-kpi-card highlight">
          <div className="dbcr-kpi-data">
            <span>Actas consolidadas</span>
            <strong>{formatNumber(baseConteo.length)}</strong>
            <small>TREP + SMS + OCR + preliminares</small>
          </div>
        </div>

        <div className="dbcr-kpi-card">
          <div className="dbcr-kpi-data">
            <span>Actas contadas</span>
            <strong>{formatNumber(baseContable.length)}</strong>
            <small>Con departamento válido</small>
          </div>
        </div>

        <div className="dbcr-kpi-card warning">
          <div className="dbcr-kpi-data">
            <span>No contadas</span>
            <strong>{formatNumber(totalNoContadas)}</strong>
            <small>Departamento no reconocido</small>
          </div>
        </div>

        <div className="dbcr-kpi-card success">
          <div className="dbcr-kpi-data">
            <span>SMS recibidos</span>
            <strong>{formatNumber(smsRecibidos.length)}</strong>
            <small>Incluye procesados y errores</small>
          </div>
        </div>
      </div>

      <div className="dbcr-party-legend">
        <span className="dbcr-legend-label">Colores por partido:</span>
        <div className="dbcr-party-pill party-p1">P1 Rojo</div>
        <div className="dbcr-party-pill party-p2">P2 Azul</div>
        <div className="dbcr-party-pill party-p3">P3 Verde</div>
        <div className="dbcr-party-pill party-p4">P4 Amarillo</div>
      </div>

      <section className="dbcr-panel dbcr-table-panel">
        <div className="dbcr-panel-header">
          <div>
            <h3>Escrutinio general del conteo rápido</h3>
            <p>
              Votos acumulados únicamente de actas con departamento reconocido.
            </p>
          </div>

          <span className="dbcr-total-votes-badge">
            Total votos: {formatNumber(totalVotos)}
          </span>
        </div>

        <div className="dbcr-table-wrapper dbcr-custom-scrollbar">
          <table className="dbcr-data-table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Candidato</th>
                <th className="dbcr-text-right">Votos</th>
                <th className="dbcr-text-right">% participación</th>
                <th className="dbcr-bar-column">Proporción</th>
              </tr>
            </thead>

            <tbody>
              {votosPorCandidato.map((item, index) => {
                const isWinner = index === 0 && item.votos > 0;
                const percentage =
                  totalVotos > 0
                    ? ((item.votos / totalVotos) * 100).toFixed(2)
                    : "0.00";

                return (
                  <tr
                    key={item.candidato}
                    className={isWinner ? "dbcr-row-winner" : ""}
                  >
                    <td className="dbcr-col-pos">
                      {isWinner ? "1°" : `${index + 1}°`}
                    </td>
                    <td className="dbcr-col-name">
                      {partyConfig[item.candidato]?.name || item.candidato}
                    </td>
                    <td className="dbcr-text-right">
                      {formatNumber(item.votos)}
                    </td>
                    <td className="dbcr-text-right">
                      <b>{percentage}%</b>
                    </td>
                    <td className="dbcr-bar-column">
                      <div className="dbcr-table-bar-bg">
                        <div
                          className={`dbcr-table-bar-fill ${item.colorClass}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {votosPorCandidato.length === 0 && (
                <tr>
                  <td colSpan="5" className="dbcr-empty-row">
                    Aún no hay votos válidos con departamento reconocido.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dbcr-panel">
        <div className="dbcr-panel-header">
          <div>
            <h3>Resultados por los 9 departamentos de Bolivia</h3>
            <p>
              Se muestran los 9 departamentos y solo se cuentan actas cuyo
              departamento fue reconocido desde el acta, mesa o SMS.
            </p>
          </div>
        </div>

        <div className="dbcr-dept-grid">
          {departamentosResumen.map((item) => {
            const ranking = getPartyRanking(item);
            const winner = item.ganador?.candidato || item.ganador || null;

            return (
              <article key={item.departamento} className="dbcr-dept-card">
                <div className="dbcr-dept-top">
                  <h4>{item.departamento}</h4>
                  <span>{formatNumber(item.actas)} actas</span>
                </div>

                <div className="dbcr-dept-winner">
                  Ganador:{" "}
                  <b>
                    {winner ? partyConfig[winner]?.name || winner : "Sin datos"}
                  </b>
                </div>

                <div className="dbcr-dept-ranks">
                  {ranking.map((rank) => (
                    <div key={rank.party} className="dbcr-dept-rank-row">
                      <span>{partyConfig[rank.party]?.label}</span>
                      <b>{formatNumber(rank.votes)}</b>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="dbcr-panel dbcr-table-panel">
        <div className="dbcr-panel-header">
          <div>
            <h3>Conteo por ubicación detectada</h3>
            <p>
              Agrupado por departamento, municipio, provincia y recinto/lugar.
            </p>
          </div>
        </div>

        <div className="dbcr-table-wrapper dbcr-custom-scrollbar">
          <table className="dbcr-data-table compact">
            <thead>
              <tr>
                <th>Departamento</th>
                <th>Municipio</th>
                <th>Provincia</th>
                <th>Recinto / lugar</th>
                <th>Actas</th>
                <th>Ganador</th>
                <th>P1</th>
                <th>P2</th>
                <th>P3</th>
                <th>P4</th>
              </tr>
            </thead>

            <tbody>
              {ubicacionesResumen.slice(0, 60).map((item, index) => {
                const winner = item.ganador?.candidato || item.ganador || null;

                return (
                  <tr key={`${item.departamento}-${item.municipio}-${index}`}>
                    <td>{item.departamento}</td>
                    <td>{item.municipio}</td>
                    <td>{item.provincia}</td>
                    <td>{item.recinto}</td>
                    <td>{formatNumber(item.actas)}</td>
                    <td>{winner ? partyConfig[winner]?.label || winner : "-"}</td>
                    <td>{formatNumber(item.P1)}</td>
                    <td>{formatNumber(item.P2)}</td>
                    <td>{formatNumber(item.P3)}</td>
                    <td>{formatNumber(item.P4)}</td>
                  </tr>
                );
              })}

              {ubicacionesResumen.length === 0 && (
                <tr>
                  <td colSpan="10" className="dbcr-empty-row">
                    No hay ubicaciones contables porque ningún departamento fue
                    reconocido.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dbcr-content-grid">
        <div className="dbcr-panel">
          <div className="dbcr-panel-header">
            <div>
              <h3>Estado del procesamiento OCR</h3>
              <p>Resumen de estados detectados en actas OCR.</p>
            </div>
          </div>

          <div className="dbcr-ocr-stats-grid">
            {Object.entries(actasOCRPorEstado).map(([estado, cantidad]) => (
              <div key={estado} className="dbcr-ocr-stat-card">
                <span>{estado}</span>
                <strong>{formatNumber(cantidad)}</strong>
              </div>
            ))}

            {Object.keys(actasOCRPorEstado).length === 0 && (
              <div className="dbcr-empty-card">Aún no hay actas OCR.</div>
            )}
          </div>
        </div>

        <div className="dbcr-panel">
          <div className="dbcr-panel-header">
            <div>
              <h3>Inconsistencias rápidas</h3>
              <p>Errores registrados por el procesamiento del conteo rápido.</p>
            </div>
          </div>

          <div className="dbcr-mini-list">
            {inconsistenciasRapidas.map((item) => (
              <div
                key={item._id || item.tipo_error}
                className="dbcr-mini-item"
              >
                <span>{item._id || item.tipo_error || "Sin tipo"}</span>
                <b>{formatNumber(item.total)}</b>
              </div>
            ))}

            {inconsistenciasRapidas.length === 0 && (
              <div className="dbcr-empty-card">
                No hay inconsistencias para mostrar.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="dbcr-panel">
        <div className="dbcr-panel-header">
          <div>
            <h3>Últimos SMS recibidos</h3>
            <p>Listado de SMS recibidos desde jurados autorizados.</p>
          </div>
        </div>

        <div className="dbcr-table-wrapper">
          <table className="dbcr-data-table compact">
            <thead>
              <tr>
                <th>Número</th>
                <th>Jurado</th>
                <th>Acta</th>
                <th>Dep.</th>
                <th>P1</th>
                <th>P2</th>
                <th>P3</th>
                <th>P4</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {normalizedSMS.slice(0, 10).map((sms, index) => (
                <tr key={sms.id || sms._id || index}>
                  <td>{sms.from_number || sms.numero || "-"}</td>
                  <td>{sms.jurado_nombre || sms.jurado || "-"}</td>
                  <td>{sms.codigo_acta || "-"}</td>
                  <td>{sms.departamento || "-"}</td>
                  <td>{formatNumber(sms.P1)}</td>
                  <td>{formatNumber(sms.P2)}</td>
                  <td>{formatNumber(sms.P3)}</td>
                  <td>{formatNumber(sms.P4)}</td>
                  <td>{formatDate(sms.created_at || sms.fecha_registro)}</td>
                  <td>
                    <span className="dbcr-estado-badge">
                      {sms.estado || "PROCESADO"}
                    </span>
                  </td>
                </tr>
              ))}

              {normalizedSMS.length === 0 && (
                <tr>
                  <td colSpan="10" className="dbcr-empty-row">
                    No hay SMS procesados para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default DashboardConteoRapidoPage;