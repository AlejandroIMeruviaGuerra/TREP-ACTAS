import { useEffect, useMemo, useState } from "react";
import {
  getActasOficialesDetalle,
  getResumenOficial,
} from "../../services/oficialService";
import "./DashboardPage.css";

const partyConfig = {
  P1: { label: "P1", colorClass: "party-p1" },
  P2: { label: "P2", colorClass: "party-p2" },
  P3: { label: "P3", colorClass: "party-p3" },
  P4: { label: "P4", colorClass: "party-p4" },
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

function normalizeVotosPorCandidato(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => ({
      candidato: item.candidato ?? item.nombre ?? "Sin candidato",
      votos: item.votos ?? item.total_votos ?? item.total ?? 0,
    }));
  }

  if (typeof value === "object") {
    return Object.entries(value).map(([candidato, votos]) => ({
      candidato,
      votos,
    }));
  }

  return [];
}

function getWinner(totals) {
  const ranking = getPartyRanking(totals);
  return ranking.length > 0 && ranking[0].votes > 0 ? ranking[0].party : null;
}

function getPartyRanking(totals) {
  return [
    { party: "P1", votes: Number(totals.p1 || 0), colorClass: "party-p1" },
    { party: "P2", votes: Number(totals.p2 || 0), colorClass: "party-p2" },
    { party: "P3", votes: Number(totals.p3 || 0), colorClass: "party-p3" },
    { party: "P4", votes: Number(totals.p4 || 0), colorClass: "party-p4" },
  ].sort((a, b) => b.votes - a.votes);
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

    dept.p1 += Number(acta.p1 || 0);
    dept.p2 += Number(acta.p2 || 0);
    dept.p3 += Number(acta.p3 || 0);
    dept.p4 += Number(acta.p4 || 0);
    dept.totalActas += 1;

    const provincia = acta.provincia || "Sin provincia";
    const municipio = acta.municipio || "Sin municipio";

    if (!dept.provincias.has(provincia)) {
      dept.provincias.set(provincia, {
        provincia,
        totalActas: 0,
        municipios: new Map(),
      });
    }

    const provinciaData = dept.provincias.get(provincia);
    provinciaData.totalActas += 1;

    if (!provinciaData.municipios.has(municipio)) {
      provinciaData.municipios.set(municipio, {
        municipio,
        totalActas: 0,
      });
    }

    provinciaData.municipios.get(municipio).totalActas += 1;
  });

  return Array.from(map.values()).map((dept) => ({
    ...dept,
    winner: getWinner(dept),
    ranking: getPartyRanking(dept),
    provincias: Array.from(dept.provincias.values())
      .map((prov) => ({
        provincia: prov.provincia,
        totalActas: prov.totalActas,
        municipios: Array.from(prov.municipios.values()).sort((a, b) =>
          a.municipio.localeCompare(b.municipio)
        ),
      }))
      .sort((a, b) => b.totalActas - a.totalActas),
  }));
}

function DashboardPage() {
  const [resumen, setResumen] = useState(null);
  const [actasDetalle, setActasDetalle] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setErrorMessage("");

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
    setActasDetalle(detalleResponse.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const votosPorCandidato = useMemo(() => {
    return normalizeVotosPorCandidato(resumen?.votos_por_candidato).sort(
      (a, b) => Number(b.votos || 0) - Number(a.votos || 0)
    );
  }, [resumen]);

  // CÁLCULO NUEVO: Total nacional para calcular porcentajes visuales
  const totalVotosNacional = useMemo(() => {
    return votosPorCandidato.reduce((acc, curr) => acc + Number(curr.votos), 0);
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

  const selectedDepartmentData = departmentMap.get(selectedDepartment) || null;

  const totalActasEnMapa = departmentResults.reduce(
    (total, item) => total + Number(item.totalActas || 0),
    0
  );

  if (loading) {
    return (
      <div className="das-loading-box">
        <svg className="mca-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        <span>Procesando datos electorales...</span>
      </div>
    );
  }

  if (errorMessage) {
    return <div className="das-error-box">{errorMessage}</div>;
  }

  return (
    <div className="das-root">
      <header className="das-header">
        <div>
          <h2 className="page-title">Centro de Mando</h2>
          <p className="page-description">Vista general y consolidada de actas oficiales validadas por el sistema.</p>
        </div>
        <button className="das-refresh-btn" onClick={loadDashboard}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
          Actualizar
        </button>
      </header>

      {/* KPI Cards Mejoradas con Íconos */}
      <div className="das-kpi-grid">
        <div className="das-kpi-card highlight">
          <div className="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
          <div className="kpi-data">
            <span>Actas Procesadas</span>
            <strong>{resumen?.actas_procesadas ?? 0}</strong>
          </div>
        </div>

        <div className="das-kpi-card">
          <div className="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg></div>
          <div className="kpi-data">
            <span>Actas en Mapa</span>
            <strong>{totalActasEnMapa}</strong>
          </div>
        </div>

        <div className="das-kpi-card warning">
          <div className="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg></div>
          <div className="kpi-data">
            <span>Mesas Pendientes / Observadas</span>
            <strong>{(resumen?.mesas_pendientes ?? 0) + (resumen?.mesas_observadas ?? 0)}</strong>
          </div>
        </div>

        <div className="das-kpi-card success">
          <div className="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
          <div className="kpi-data">
            <span>Votos Válidos</span>
            <strong>{resumen?.votos_validos ?? 0}</strong>
          </div>
        </div>
      </div>

      {/* Leyenda Elegante */}
      <div className="das-party-legend">
        <span className="legend-label">Fuerzas Políticas:</span>
        <div className="party-pill party-p1">P1 Rojo</div>
        <div className="party-pill party-p2">P2 Azul</div>
        <div className="party-pill party-p3">P3 Verde</div>
        <div className="party-pill party-p4">P4 Amarillo</div>
      </div>

      <section className="das-map-section">
        {/* Panel Izquierdo: Mapa de Departamentos */}
        <div className="das-panel">
          <div className="panel-header">
            <h3>Dominio Territorial</h3>
            <span className="badge">Oficial</span>
          </div>

          <div className="bolivia-grid">
            {departmentsToRender.map((department) => {
              const data = departmentMap.get(department);
              const winner = data?.winner;
              const winnerClass = winner ? partyConfig[winner]?.colorClass : "party-empty";

              return (
                <button
                  key={department}
                  className={`dept-tile ${winnerClass} ${selectedDepartment === department ? "is-selected" : ""}`}
                  onClick={() => setSelectedDepartment(department)}
                >
                  <span className="dept-name">{department}</span>
                  {data ? (
                    <div className="dept-stats">
                      <span className="winner-tag">Gana {winner}</span>
                      <span className="actas-tag">{data.totalActas} actas</span>
                    </div>
                  ) : (
                    <span className="empty-tag">Sin datos</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel Derecho: Detalle del Departamento */}
        <div className="das-panel detail-panel">
          {!selectedDepartmentData ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon></svg>
              <p>Selecciona un departamento en la cuadrícula para analizar su escrutinio.</p>
            </div>
          ) : (
            <div className="detail-content animate-fade-in">
              <div className="detail-header">
                <h3>{selectedDepartmentData.departamento}</h3>
                <span className="badge-dark">{selectedDepartmentData.totalActas} Actas</span>
              </div>

              {/* Ranking con Barras Visuales */}
              <div className="department-ranking">
                {selectedDepartmentData.ranking.map((item, index) => {
                  // Calcular porcentaje local para la barra
                  const totalVotosDept = selectedDepartmentData.ranking.reduce((sum, r) => sum + r.votes, 0);
                  const percentage = totalVotosDept > 0 ? ((item.votes / totalVotosDept) * 100).toFixed(1) : 0;

                  return (
                    <div key={item.party} className={`rank-card ${item.colorClass}`}>
                      <div className="rank-info">
                        <span className="rank-pos">#{index + 1}</span>
                        <strong>{item.party}</strong>
                      </div>
                      <div className="rank-stats">
                        <span className="rank-votes">{item.votes.toLocaleString()} vts</span>
                        <span className="rank-pct">{percentage}%</span>
                      </div>
                      <div className="rank-bar-bg">
                        <div className="rank-bar-fill" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <h4 className="section-subtitle">Estructura Provincial</h4>
              <div className="province-list custom-scrollbar">
                {selectedDepartmentData.provincias.map((prov) => (
                  <div key={prov.provincia} className="province-item">
                    <div className="province-head">
                      <b>{prov.provincia}</b>
                      <span className="pill-actas">{prov.totalActas} actas</span>
                    </div>
                    <ul>
                      {prov.municipios.map((mun) => (
                        <li key={mun.municipio}>
                          <span className="mun-name">{mun.municipio}</span>
                          <span className="mun-actas">{mun.totalActas} actas</span>
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

      {/* Tabla de Votos Consolidados */}
      <section className="das-panel table-panel">
        <div className="panel-header">
          <h3>Escrutinio Nacional Consolidado</h3>
          <span className="total-votes-badge">Total Votos: {totalVotosNacional.toLocaleString()}</span>
        </div>

        <div className="table-wrapper custom-scrollbar">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Candidato / Partido</th>
                <th className="text-right">Votos</th>
                <th className="text-right">% Participación</th>
                <th className="bar-column">Proporción Visual</th>
              </tr>
            </thead>
            <tbody>
              {votosPorCandidato.map((item, index) => {
                const isWinner = index === 0 && item.votos > 0;
                const percentage = totalVotosNacional > 0 ? ((item.votos / totalVotosNacional) * 100).toFixed(2) : 0;
                
                return (
                  <tr key={item.candidato} className={isWinner ? "row-winner" : ""}>
                    <td className="col-pos">
                      {isWinner ? <span className="trophy">🏆</span> : `${index + 1}°`}
                    </td>
                    <td className="col-name">{item.candidato}</td>
                    <td className="col-votes text-right">{Number(item.votos || 0).toLocaleString()}</td>
                    <td className="col-pct text-right"><b>{percentage}%</b></td>
                    <td className="bar-column">
                      <div className="table-bar-bg">
                        <div 
                          className={`table-bar-fill party-${item.candidato.toLowerCase()}`} 
                          style={{ width: `${percentage}%`, backgroundColor: isWinner ? '#9f0712' : '#9ca3af' }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {votosPorCandidato.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-row">Aún no hay votos computados en el sistema.</td>
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