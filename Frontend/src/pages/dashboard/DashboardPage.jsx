import { useEffect, useMemo, useState } from "react";
import {
  getActasOficialesDetalle,
  getResumenOficial,
} from "../../services/oficialService";
import "./DashboardPage.css";

const partyConfig = {
  P1: {
    label: "P1",
    colorClass: "party-p1",
  },
  P2: {
    label: "P2",
    colorClass: "party-p2",
  },
  P3: {
    label: "P3",
    colorClass: "party-p3",
  },
  P4: {
    label: "P4",
    colorClass: "party-p4",
  },
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
    {
      party: "P1",
      votes: Number(totals.p1 || 0),
      colorClass: "party-p1",
    },
    {
      party: "P2",
      votes: Number(totals.p2 || 0),
      colorClass: "party-p2",
    },
    {
      party: "P3",
      votes: Number(totals.p3 || 0),
      colorClass: "party-p3",
    },
    {
      party: "P4",
      votes: Number(totals.p4 || 0),
      colorClass: "party-p4",
    },
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
    return <div className="loading-box">Cargando dashboard...</div>;
  }

  if (errorMessage) {
    return <div className="error-box">{errorMessage}</div>;
  }

  return (
    <div className="das-root">
      <h2 className="page-title">Dashboard general</h2>

      <p className="page-description">
        Resumen general usando solamente actas oficiales registradas.
      </p>

      <div className="das-grid">
        <div className="das-card">
          <span>Actas oficiales</span>
          <strong>{resumen?.actas_procesadas ?? 0}</strong>
        </div>

        <div className="das-card">
          <span>Actas oficiales en mapa</span>
          <strong>{totalActasEnMapa}</strong>
        </div>

        <div className="das-card">
          <span>Mesas pendientes</span>
          <strong>{resumen?.mesas_pendientes ?? 0}</strong>
        </div>

        <div className="das-card">
          <span>Mesas procesadas</span>
          <strong>{resumen?.mesas_procesadas ?? 0}</strong>
        </div>

        <div className="das-card">
          <span>Mesas observadas</span>
          <strong>{resumen?.mesas_observadas ?? 0}</strong>
        </div>

        <div className="das-card">
          <span>Votos válidos</span>
          <strong>{resumen?.votos_validos ?? 0}</strong>
        </div>

        <div className="das-card">
          <span>Votos blancos</span>
          <strong>{resumen?.votos_blancos ?? 0}</strong>
        </div>

        <div className="das-card">
          <span>Votos nulos</span>
          <strong>{resumen?.votos_nulos ?? 0}</strong>
        </div>
      </div>

      <section className="das-section">
        <h3>Colores por partido</h3>

        <div className="das-party-legend">
          <span className="party-pill party-p1">P1 rojo</span>
          <span className="party-pill party-p2">P2 azul</span>
          <span className="party-pill party-p3">P3 verde</span>
          <span className="party-pill party-p4">P4 amarillo</span>
        </div>
      </section>

      <section className="das-section das-map-section">
        <div>
          <h3>Resultados oficiales por departamento</h3>

          <p className="das-muted">
            Este bloque cuenta solamente datos de actas oficiales. No usa actas
            observadas.
          </p>

          <div className="bolivia-map">
            {departmentsToRender.map((department) => {
              const data = departmentMap.get(department);
              const winner = data?.winner;
              const winnerClass = winner
                ? partyConfig[winner]?.colorClass
                : "party-empty";

              return (
                <button
                  key={department}
                  className={`bolivia-dept ${winnerClass} ${
                    selectedDepartment === department
                      ? "bolivia-dept-selected"
                      : ""
                  }`}
                  onClick={() => setSelectedDepartment(department)}
                >
                  <span>{department}</span>
                  <small>
                    {winner
                      ? `Gana ${winner} | ${data.totalActas} actas`
                      : "Sin actas oficiales"}
                  </small>
                </button>
              );
            })}
          </div>
        </div>

        <div className="department-detail">
          {!selectedDepartmentData && (
            <>
              <h3>Detalle departamental</h3>
              <p>
                Selecciona un departamento con actas oficiales para ver el
                desglose.
              </p>
            </>
          )}

          {selectedDepartmentData && (
            <>
              <h3>{selectedDepartmentData.departamento}</h3>

              <div className="department-ranking">
                {selectedDepartmentData.ranking.map((item, index) => (
                  <div
                    key={item.party}
                    className={`rank-card ${item.colorClass}`}
                  >
                    <span>{index + 1}° lugar</span>
                    <strong>{item.party}</strong>
                    <small>{item.votes.toLocaleString()} votos</small>
                  </div>
                ))}
              </div>

              <p>
                <b>Actas oficiales:</b> {selectedDepartmentData.totalActas}
              </p>

              <p>
                <b>Ganador parcial:</b>{" "}
                {selectedDepartmentData.winner || "Sin datos"}
              </p>

              <h4>Provincias y municipios</h4>

              <div className="province-list">
                {selectedDepartmentData.provincias.map((prov) => (
                  <div key={prov.provincia} className="province-item">
                    <div className="province-head">
                      <b>{prov.provincia}</b>
                      <span>{prov.totalActas} actas</span>
                    </div>

                    <ul>
                      {prov.municipios.map((mun) => (
                        <li key={mun.municipio}>
                          {mun.municipio}{" "}
                          <span>{mun.totalActas} actas</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="das-section">
        <h3>Votos por candidato</h3>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Posición</th>
                <th>Candidato</th>
                <th>Total votos</th>
              </tr>
            </thead>

            <tbody>
              {votosPorCandidato.map((item, index) => (
                <tr key={item.candidato}>
                  <td>{index + 1}°</td>
                  <td>{item.candidato}</td>
                  <td>{Number(item.votos || 0).toLocaleString()}</td>
                </tr>
              ))}

              {votosPorCandidato.length === 0 && (
                <tr>
                  <td colSpan="3">No hay votos registrados todavía.</td>
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