import { useEffect, useMemo, useState } from "react";
import {
  getActasOficialesDetalle,
  getResumenOficial,
} from "../../services/oficialService";
import "./DashboardPage.css";

const partyConfig = {
  P1: { label: "P1", colorClass: "party-p1", name: "P1 Rojo" },
  P2: { label: "P2", colorClass: "party-p2", name: "P2 Azul" },
  P3: { label: "P3", colorClass: "party-p3", name: "P3 Verde" },
  P4: { label: "P4", colorClass: "party-p4", name: "P4 Amarillo" },
};

const boliviaDepartments = [
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
    chuquisaca: "Chuquisaca",
    lapaz: "La Paz",
    "la paz": "La Paz",
    cochabamba: "Cochabamba",
    oruro: "Oruro",
    potosi: "Potosí",
    potosí: "Potosí",
    tarija: "Tarija",
    santacruz: "Santa Cruz",
    "santa cruz": "Santa Cruz",
    beni: "Beni",
    pando: "Pando",
  };

  return map[text] || value || "Sin departamento";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("es-BO");
}

function getNumber(value) {
  return Number(value || 0);
}

function getActaVotes(acta) {
  return {
    p1: getNumber(acta.p1 ?? acta.P1 ?? acta.candidato_1 ?? acta.votos_p1),
    p2: getNumber(acta.p2 ?? acta.P2 ?? acta.candidato_2 ?? acta.votos_p2),
    p3: getNumber(acta.p3 ?? acta.P3 ?? acta.candidato_3 ?? acta.votos_p3),
    p4: getNumber(acta.p4 ?? acta.P4 ?? acta.candidato_4 ?? acta.votos_p4),
  };
}

function getPartyRanking(totals) {
  return [
    { party: "P1", votes: getNumber(totals.p1), colorClass: "party-p1" },
    { party: "P2", votes: getNumber(totals.p2), colorClass: "party-p2" },
    { party: "P3", votes: getNumber(totals.p3), colorClass: "party-p3" },
    { party: "P4", votes: getNumber(totals.p4), colorClass: "party-p4" },
  ].sort((a, b) => b.votes - a.votes);
}

function getWinner(totals) {
  const ranking = getPartyRanking(totals);
  return ranking.length > 0 && ranking[0].votes > 0 ? ranking[0].party : null;
}

function normalizeVotosPorCandidato(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        candidato: item.candidato ?? item.nombre ?? "Sin candidato",
        votos: item.votos ?? item.total_votos ?? item.total ?? 0,
      }))
      .sort((a, b) => Number(b.votos || 0) - Number(a.votos || 0));
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([candidato, votos]) => ({
        candidato,
        votos,
      }))
      .sort((a, b) => Number(b.votos || 0) - Number(a.votos || 0));
  }

  return [];
}

function createAggregate(label) {
  return {
    label,
    p1: 0,
    p2: 0,
    p3: 0,
    p4: 0,
    totalActas: 0,
  };
}

function addActaToAggregate(aggregate, acta) {
  const votes = getActaVotes(acta);

  aggregate.p1 += votes.p1;
  aggregate.p2 += votes.p2;
  aggregate.p3 += votes.p3;
  aggregate.p4 += votes.p4;
  aggregate.totalActas += 1;
}

function finishAggregate(aggregate) {
  const ranking = getPartyRanking(aggregate);
  const totalVotos = ranking.reduce((total, item) => total + item.votes, 0);

  return {
    ...aggregate,
    ranking,
    totalVotos,
    winner: getWinner(aggregate),
  };
}

function groupByDepartment(actas) {
  const map = new Map();

  actas.forEach((acta) => {
    const departamento = normalizeDepartment(acta.departamento);

    if (!map.has(departamento)) {
      map.set(departamento, {
        departamento,
        p1: 0,
        p2: 0,
        p3: 0,
        p4: 0,
        totalActas: 0,
        provincias: new Map(),
      });
    }

    const dept = map.get(departamento);
    const votes = getActaVotes(acta);

    dept.p1 += votes.p1;
    dept.p2 += votes.p2;
    dept.p3 += votes.p3;
    dept.p4 += votes.p4;
    dept.totalActas += 1;

    const provincia = acta.provincia || "Sin provincia";
    const municipio = acta.municipio || "Sin municipio";

    if (!dept.provincias.has(provincia)) {
      dept.provincias.set(provincia, {
        provincia,
        p1: 0,
        p2: 0,
        p3: 0,
        p4: 0,
        totalActas: 0,
        municipios: new Map(),
      });
    }

    const provinciaData = dept.provincias.get(provincia);

    provinciaData.p1 += votes.p1;
    provinciaData.p2 += votes.p2;
    provinciaData.p3 += votes.p3;
    provinciaData.p4 += votes.p4;
    provinciaData.totalActas += 1;

    if (!provinciaData.municipios.has(municipio)) {
      provinciaData.municipios.set(municipio, {
        municipio,
        p1: 0,
        p2: 0,
        p3: 0,
        p4: 0,
        totalActas: 0,
      });
    }

    const municipioData = provinciaData.municipios.get(municipio);

    municipioData.p1 += votes.p1;
    municipioData.p2 += votes.p2;
    municipioData.p3 += votes.p3;
    municipioData.p4 += votes.p4;
    municipioData.totalActas += 1;
  });

  return Array.from(map.values()).map((dept) => {
    const finishedDept = finishAggregate(dept);

    return {
      ...finishedDept,
      departamento: dept.departamento,
      provincias: Array.from(dept.provincias.values())
        .map((prov) => {
          const finishedProv = finishAggregate(prov);

          return {
            ...finishedProv,
            provincia: prov.provincia,
            municipios: Array.from(prov.municipios.values())
              .map((mun) => ({
                ...finishAggregate(mun),
                municipio: mun.municipio,
              }))
              .sort((a, b) => b.totalActas - a.totalActas),
          };
        })
        .sort((a, b) => b.totalActas - a.totalActas),
    };
  });
}

function uniqueValues(items) {
  return Array.from(new Set(items.filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

function DashboardPage() {
  const [resumen, setResumen] = useState(null);
  const [actasDetalle, setActasDetalle] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [filterDepartamento, setFilterDepartamento] = useState("");
  const [filterProvincia, setFilterProvincia] = useState("");
  const [filterMunicipio, setFilterMunicipio] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

    try {
      const [resumenResponse, detalleResponse] = await Promise.all([
        getResumenOficial(),
        getActasOficialesDetalle(),
      ]);

      if (!resumenResponse.ok) {
        setErrorMessage(
          resumenResponse.message || "No se pudo cargar el resumen."
        );
        setLoading(false);
        return;
      }

      if (!detalleResponse.ok) {
        setErrorMessage(
          detalleResponse.message ||
          "No se pudo cargar el detalle por departamento."
        );
        setLoading(false);
        return;
      }

      setResumen(resumenResponse.data || {});
      setActasDetalle(
        Array.isArray(detalleResponse.data) ? detalleResponse.data : []
      );
      setLoading(false);
    } catch (error) {
      setErrorMessage(error.message || "Error cargando el dashboard.");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const votosPorCandidato = useMemo(() => {
    return normalizeVotosPorCandidato(resumen?.votos_por_candidato);
  }, [resumen]);

  const totalVotosNacional = useMemo(() => {
    return votosPorCandidato.reduce(
      (total, item) => total + Number(item.votos || 0),
      0
    );
  }, [votosPorCandidato]);

  const departmentResults = useMemo(() => {
    return groupByDepartment(actasDetalle);
  }, [actasDetalle]);

  const departmentMap = useMemo(() => {
    const map = new Map();

    departmentResults.forEach((item) => {
      map.set(item.departamento, item);
    });

    return map;
  }, [departmentResults]);

  const departmentsToRender = useMemo(() => {
    const dynamicDepartments = departmentResults.map(
      (item) => item.departamento
    );

    return Array.from(new Set([...boliviaDepartments, ...dynamicDepartments]));
  }, [departmentResults]);

  const departamentosOptions = useMemo(() => {
    const dynamicDepartments = actasDetalle.map((acta) =>
      normalizeDepartment(acta.departamento)
    );

    return Array.from(new Set([...boliviaDepartments, ...dynamicDepartments]))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [actasDetalle]);

  const municipiosOptions = useMemo(() => {
    if (!filterDepartamento) return [];

    return uniqueValues(
      actasDetalle
        .filter(
          (acta) =>
            normalizeDepartment(acta.departamento) === filterDepartamento
        )
        .map((acta) => acta.municipio || "Sin municipio")
    );
  }, [actasDetalle, filterDepartamento]);

  const provinciasOptions = useMemo(() => {
    if (!filterDepartamento || !filterMunicipio) return [];

    return uniqueValues(
      actasDetalle
        .filter(
          (acta) =>
            normalizeDepartment(acta.departamento) === filterDepartamento &&
            String(acta.municipio || "Sin municipio") === filterMunicipio
        )
        .map((acta) => acta.provincia || "Sin provincia")
    );
  }, [actasDetalle, filterDepartamento, filterMunicipio]);

  const searchResult = useMemo(() => {
    if (!filterDepartamento) return null;

    const filtered = actasDetalle.filter((acta) => {
      const sameDepartment =
        normalizeDepartment(acta.departamento) === filterDepartamento;

      const sameProvince = filterProvincia
        ? String(acta.provincia || "Sin provincia") === filterProvincia
        : true;

      const sameMunicipio = filterMunicipio
        ? String(acta.municipio || "Sin municipio") === filterMunicipio
        : true;

      return sameDepartment && sameProvince && sameMunicipio;
    });

    let label = filterDepartamento;

    if (filterMunicipio) {
      label += ` / ${filterMunicipio}`;
    }

    if (filterProvincia) {
      label += ` / ${filterProvincia}`;
    }

    const aggregate = createAggregate(label);

    filtered.forEach((acta) => {
      addActaToAggregate(aggregate, acta);
    });

    return finishAggregate(aggregate);
  }, [actasDetalle, filterDepartamento, filterProvincia, filterMunicipio]);

  const selectedDepartmentData = departmentMap.get(selectedDepartment) || null;

  const totalActasEnMapa = departmentResults.reduce(
    (total, item) => total + Number(item.totalActas || 0),
    0
  );

  function handleDepartamentoFilter(value) {
    setFilterDepartamento(value);
    setFilterMunicipio("");
    setFilterProvincia("");

    if (value) {
      setSelectedDepartment(value);
    }
  }

  function handleMunicipioFilter(value) {
    setFilterMunicipio(value);
    setFilterProvincia("");
  }

  function clearSearch() {
    setFilterDepartamento("");
    setFilterProvincia("");
    setFilterMunicipio("");
  }

  if (loading) {
    return (
      <div className="das-root">
        <div className="das-loading-box">
          <div className="das-loading-spinner" />
          <span>Procesando datos electorales...</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="das-root">
        <div className="das-error-box">{errorMessage}</div>
      </div>
    );
  }

  return (
    <div className="das-root">
      <header className="das-header">
        <div>
          <h2 className="page-title">Centro de Mando</h2>
          <p className="page-description">
            Vista general y consolidada de actas oficiales validadas por el
            sistema.
          </p>
        </div>

        <button className="das-refresh-btn" onClick={loadDashboard}>
          Actualizar
        </button>
      </header>

      <div className="das-kpi-grid">
        <div className="das-kpi-card highlight">
          <div className="kpi-data">
            <span>Actas procesadas</span>
            <strong>{formatNumber(resumen?.actas_procesadas ?? 0)}</strong>
          </div>
        </div>

        <div className="das-kpi-card">
          <div className="kpi-data">
            <span>Actas en mapa</span>
            <strong>{formatNumber(totalActasEnMapa)}</strong>
          </div>
        </div>

        <div className="das-kpi-card warning">
          <div className="kpi-data">
            <span>Mesas pendientes / observadas</span>
            <strong>
              {formatNumber(
                (resumen?.mesas_pendientes ?? 0) +
                (resumen?.mesas_observadas ?? 0)
              )}
            </strong>
          </div>
        </div>

        <div className="das-kpi-card success">
          <div className="kpi-data">
            <span>Votos válidos</span>
            <strong>{formatNumber(resumen?.votos_validos ?? 0)}</strong>
          </div>
        </div>
      </div>

      <div className="das-party-legend">
        <span className="legend-label">Fuerzas políticas:</span>
        <div className="party-pill party-p1">P1 Rojo</div>
        <div className="party-pill party-p2">P2 Azul</div>
        <div className="party-pill party-p3">P3 Verde</div>
        <div className="party-pill party-p4">P4 Amarillo</div>
      </div>

      <section className="das-panel das-search-panel">
        <div className="panel-header">
          <div>
            <h3>Buscador territorial de resultados</h3>
            <p>
              Selecciona departamento, municipio o provincia para ver el ganador
              y los votos oficiales.
            </p>
          </div>

          <button type="button" className="das-clear-btn" onClick={clearSearch}>
            Limpiar
          </button>
        </div>

        <div className="das-filter-grid">
          <div className="das-filter-field">
            <label>Departamento</label>
            <select
              value={filterDepartamento}
              onChange={(event) => handleDepartamentoFilter(event.target.value)}
            >
              <option value="">Seleccionar departamento</option>
              {departamentosOptions.map((departamento) => (
                <option key={departamento} value={departamento}>
                  {departamento}
                </option>
              ))}
            </select>
          </div>

          <div className="das-filter-field">
            <label>Municipio</label>
            <select
              value={filterMunicipio}
              disabled={!filterDepartamento}
              onChange={(event) => handleMunicipioFilter(event.target.value)}
            >
              <option value="">Todos los municipios</option>
              {municipiosOptions.map((municipio) => (
                <option key={municipio} value={municipio}>
                  {municipio}
                </option>
              ))}
            </select>
          </div>

          <div className="das-filter-field">
            <label>Provincia</label>
            <select
              value={filterProvincia}
              disabled={!filterMunicipio}
              onChange={(event) => setFilterProvincia(event.target.value)}
            >
              <option value="">Todas las provincias</option>
              {provinciasOptions.map((provincia) => (
                <option key={provincia} value={provincia}>
                  {provincia}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!searchResult && (
          <div className="das-search-empty">
            Selecciona al menos un departamento para calcular el resultado.
          </div>
        )}

        {searchResult && (
          <div className="das-search-result">
            <div className="das-winner-banner">
              <div>
                <span>Resultado para</span>
                <strong>{searchResult.label}</strong>
              </div>

              <div>
                <span>Ganador</span>
                <strong>
                  {searchResult.winner
                    ? partyConfig[searchResult.winner]?.name
                    : "Sin ganador"}
                </strong>
              </div>

              <div>
                <span>Actas oficiales</span>
                <strong>{formatNumber(searchResult.totalActas)}</strong>
              </div>
            </div>

            <div className="search-ranking-grid">
              {searchResult.ranking.map((item, index) => {
                const percentage =
                  searchResult.totalVotos > 0
                    ? ((item.votes / searchResult.totalVotos) * 100).toFixed(2)
                    : "0.00";

                return (
                  <div
                    key={item.party}
                    className={`search-rank-card ${item.colorClass}`}
                  >
                    <div className="search-rank-top">
                      <span>#{index + 1}</span>
                      <strong>{partyConfig[item.party]?.name}</strong>
                    </div>

                    <div className="search-rank-numbers">
                      <b>{formatNumber(item.votes)} votos</b>
                      <span>{percentage}%</span>
                    </div>

                    <div className="rank-bar-bg">
                      <div
                        className="rank-bar-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="das-map-section">
        <div className="das-panel">
          <div className="panel-header">
            <h3>Dominio territorial</h3>
            <span className="badge">Oficial</span>
          </div>

          <div className="bolivia-grid">
            {departmentsToRender.map((department) => {
              const data = departmentMap.get(department);
              const winner = data?.winner;
              const winnerClass = winner
                ? partyConfig[winner]?.colorClass
                : "party-empty";

              return (
                <button
                  key={department}
                  className={`dept-tile ${winnerClass} ${selectedDepartment === department ? "is-selected" : ""
                    }`}
                  onClick={() => setSelectedDepartment(department)}
                >
                  <span className="dept-name">{department}</span>

                  {data ? (
                    <div className="dept-stats">
                      <span className="winner-tag">
                        {winner ? `Gana ${winner}` : "Sin ganador"}
                      </span>
                      <span className="actas-tag">
                        {formatNumber(data.totalActas)} actas
                      </span>
                    </div>
                  ) : (
                    <span className="empty-tag">Sin datos</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="das-panel detail-panel">
          {!selectedDepartmentData ? (
            <div className="empty-state">
              <p>
                Selecciona un departamento para analizar su escrutinio oficial.
              </p>
            </div>
          ) : (
            <div className="detail-content animate-fade-in">
              <div className="detail-header">
                <h3>{selectedDepartmentData.departamento}</h3>
                <span className="badge-dark">
                  {formatNumber(selectedDepartmentData.totalActas)} actas
                </span>
              </div>

              <div className="department-ranking">
                {selectedDepartmentData.ranking.map((item, index) => {
                  const totalVotosDept =
                    selectedDepartmentData.ranking.reduce(
                      (sum, current) => sum + current.votes,
                      0
                    );

                  const percentage =
                    totalVotosDept > 0
                      ? ((item.votes / totalVotosDept) * 100).toFixed(1)
                      : "0.0";

                  return (
                    <div
                      key={item.party}
                      className={`rank-card ${item.colorClass}`}
                    >
                      <div className="rank-info">
                        <span className="rank-pos">#{index + 1}</span>
                        <strong>{item.party}</strong>
                      </div>

                      <div className="rank-stats">
                        <span>{formatNumber(item.votes)} votos</span>
                        <span>{percentage}%</span>
                      </div>

                      <div className="rank-bar-bg">
                        <div
                          className="rank-bar-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <h4 className="section-subtitle">Estructura provincial</h4>

              <div className="province-list custom-scrollbar">
                {selectedDepartmentData.provincias.map((prov) => (
                  <div key={prov.provincia} className="province-item">
                    <div className="province-head">
                      <div>
                        <b>{prov.provincia}</b>
                        <small>
                          Ganador:{" "}
                          {prov.winner
                            ? partyConfig[prov.winner]?.name
                            : "Sin ganador"}
                        </small>
                      </div>

                      <span className="pill-actas">
                        {formatNumber(prov.totalActas)} actas
                      </span>
                    </div>

                    <ul>
                      {prov.municipios.map((mun) => (
                        <li key={mun.municipio}>
                          <span className="mun-name">
                            {mun.municipio} — gana{" "}
                            {mun.winner
                              ? partyConfig[mun.winner]?.label
                              : "N/A"}
                          </span>
                          <span className="mun-actas">
                            {formatNumber(mun.totalActas)} actas
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="das-panel table-panel">
        <div className="panel-header">
          <h3>Escrutinio nacional consolidado</h3>
          <span className="total-votes-badge">
            Total votos: {formatNumber(totalVotosNacional)}
          </span>
        </div>

        <div className="table-wrapper custom-scrollbar">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Candidato / partido</th>
                <th className="text-right">Votos</th>
                <th className="text-right">% participación</th>
                <th className="bar-column">Proporción visual</th>
              </tr>
            </thead>

            <tbody>
              {votosPorCandidato.map((item, index) => {
                const isWinner = index === 0 && item.votos > 0;
                const percentage =
                  totalVotosNacional > 0
                    ? ((item.votos / totalVotosNacional) * 100).toFixed(2)
                    : "0.00";

                const partyKey = String(item.candidato || "").toUpperCase();
                const colorClass =
                  partyConfig[partyKey]?.colorClass || "party-empty";

                return (
                  <tr
                    key={item.candidato}
                    className={isWinner ? "row-winner" : ""}
                  >
                    <td className="col-pos">
                      {isWinner ? "1°" : `${index + 1}°`}
                    </td>
                    <td className="col-name">{item.candidato}</td>
                    <td className="col-votes text-right">
                      {formatNumber(item.votos)}
                    </td>
                    <td className="col-pct text-right">
                      <b>{percentage}%</b>
                    </td>
                    <td className="bar-column">
                      <div className="table-bar-bg">
                        <div
                          className={`table-bar-fill ${colorClass}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {votosPorCandidato.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-row">
                    Aún no hay votos computados en el sistema.
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

export default DashboardPage;