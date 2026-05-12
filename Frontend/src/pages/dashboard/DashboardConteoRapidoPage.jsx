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
      if (!actasPreliminaresResp.ok) throw new Error(actasPreliminaresResp.message);
      if (!actasTREPResp.ok) throw new Error(actasTREPResp.message);
      if (!smsResp.ok) throw new Error(smsResp.message);
      if (!estadisticasResp.ok) throw new Error(estadisticasResp.message);

      setResumen(resumenResp.data);
      setActasOCR(actasOCRResp.data || []);
      setActasPreliminares(actasPreliminaresResp.data || []);
      setActasTREP(actasTREPResp.data || []);
      setSmsRecibidos(smsResp.data || []);
      setEstadisticas(estadisticasResp.data);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConteoRapido();
  }, []);

  // Calcular votos por candidato desde actas_trep
  const votosPorCandidato = useMemo(() => {
    const totals = {
      P1: 0,
      P2: 0,
      P3: 0,
      P4: 0,
    };

    actasTREP.forEach((acta) => {
      totals.P1 += Number(acta.P1 || 0);
      totals.P2 += Number(acta.P2 || 0);
      totals.P3 += Number(acta.P3 || 0);
      totals.P4 += Number(acta.P4 || 0);
    });

    return Object.entries(totals)
      .map(([candidato, votos]) => ({ candidato, votos }))
      .sort((a, b) => b.votos - a.votos);
  }, [actasTREP]);

  const totalVotos = useMemo(() => {
    return votosPorCandidato.reduce((acc, curr) => acc + curr.votos, 0);
  }, [votosPorCandidato]);

  // Actas OCR por estado
  const actasOCRPorEstado = useMemo(() => {
    const estados = {};
    actasOCR.forEach((acta) => {
      const estado = acta.estado || "desconocido";
      estados[estado] = (estados[estado] || 0) + 1;
    });
    return estados;
  }, [actasOCR]);

  if (loading) {
    return (
      <div className="dbcr-loading-box">
        <svg className="dbcr-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        <span>Cargando datos de Conteo Rápido...</span>
      </div>
    );
  }

  if (errorMessage) {
    return <div className="dbcr-error-box">{errorMessage}</div>;
  }

  return (
    <div className="dbcr-root">
      <header className="dbcr-header">
        <div>
          <h2 className="dbcr-page-title">Conteo Rápido - TREP</h2>
          <p className="dbcr-page-description">
            Actas procesadas por OCR, SMS y carga preliminar en tiempo real
          </p>
        </div>
        <button className="dbcr-refresh-btn" onClick={loadConteoRapido}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
          Actualizar
        </button>
      </header>

      {/* KPI Cards */}
      <div className="dbcr-kpi-grid">
        <div className="dbcr-kpi-card highlight">
          <div className="dbcr-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <div className="dbcr-kpi-data">
            <span>Actas OCR</span>
            <strong>{actasOCR.length}</strong>
            <small>Procesadas</small>
          </div>
        </div>

        <div className="dbcr-kpi-card">
          <div className="dbcr-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div className="dbcr-kpi-data">
            <span>Actas TREP</span>
            <strong>{actasTREP.length}</strong>
            <small>Digitalizadas</small>
          </div>
        </div>

        <div className="dbcr-kpi-card warning">
          <div className="dbcr-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 8v8"></path>
              <path d="M8 12h8"></path>
            </svg>
          </div>
          <div className="dbcr-kpi-data">
            <span>Actas Preliminares</span>
            <strong>{actasPreliminares.length}</strong>
            <small>Carga manual</small>
          </div>
        </div>

        <div className="dbcr-kpi-card success">
          <div className="dbcr-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </div>
          <div className="dbcr-kpi-data">
            <span>SMS Recibidos</span>
            <strong>{smsRecibidos.length}</strong>
            <small>Jurados</small>
          </div>
        </div>
      </div>

      {/* Estado de OCR */}
      <section className="dbcr-panel">
        <div className="dbcr-panel-header">
          <h3>Estado del Procesamiento OCR</h3>
        </div>
        <div className="dbcr-ocr-stats-grid">
          {Object.entries(actasOCRPorEstado).map(([estado, cantidad]) => (
            <div key={estado} className="dbcr-ocr-stat-card">
              <span className="dbcr-estado-label">{estado}</span>
              <strong>{cantidad}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* Tabla de Votos - Conteo Rápido */}
      <section className="dbcr-panel dbcr-table-panel">
        <div className="dbcr-panel-header">
          <h3>Escrutinio Conteo Rápido (TREP)</h3>
          <span className="dbcr-total-votes-badge">
            Total Votos: {totalVotos.toLocaleString()}
          </span>
        </div>

        <div className="dbcr-table-wrapper dbcr-custom-scrollbar">
          <table className="dbcr-data-table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Candidato</th>
                <th className="dbcr-text-right">Votos</th>
                <th className="dbcr-text-right">% Participación</th>
                <th className="dbcr-bar-column">Proporción</th>
              </tr>
            </thead>
            <tbody>
              {votosPorCandidato.map((item, index) => {
                const isWinner = index === 0 && item.votos > 0;
                const percentage = totalVotos > 0 ? ((item.votos / totalVotos) * 100).toFixed(2) : 0;

                return (
                  <tr key={item.candidato} className={isWinner ? "dbcr-row-winner" : ""}>
                    <td className="dbcr-col-pos">
                      {isWinner ? <span className="dbcr-trophy">🏆</span> : `${index + 1}°`}
                    </td>
                    <td className="dbcr-col-name">{item.candidato}</td>
                    <td className="dbcr-text-right">{item.votos.toLocaleString()}</td>
                    <td className="dbcr-text-right"><b>{percentage}%</b></td>
                    <td className="dbcr-bar-column">
                      <div className="dbcr-table-bar-bg">
                        <div
                          className={`dbcr-table-bar-fill party-${item.candidato.toLowerCase()}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {votosPorCandidato.length === 0 && (
                <tr>
                  <td colSpan="5" className="dbcr-empty-row">
                    Aún no hay votos en el sistema de conteo rápido
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Últimos SMS */}
      <section className="dbcr-panel">
        <div className="dbcr-panel-header">
          <h3>Últimos SMS Recibidos</h3>
        </div>
        <div className="dbcr-table-wrapper">
          <table className="dbcr-data-table compact">
            <thead>
              <tr>
                <th>Número</th>
                <th>Jurado</th>
                <th>Mensaje</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {smsRecibidos.slice(0, 10).map((sms) => (
                <tr key={sms._id}>
                  <td>{sms.from_number}</td>
                  <td>{sms.jurado_nombre || "-"}</td>
                  <td className="dbcr-sms-body">{sms.body?.substring(0, 50)}...</td>
                  <td>{new Date(sms.created_at).toLocaleString()}</td>
                  <td>
                    <span className={`dbcr-estado-badge dbcr-estado-${sms.estado}`}>
                      {sms.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {smsRecibidos.length === 0 && (
                <tr>
                  <td colSpan="5" className="dbcr-empty-row">
                    No hay SMS recibidos
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