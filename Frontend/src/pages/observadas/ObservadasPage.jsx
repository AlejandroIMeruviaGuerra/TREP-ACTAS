import { useEffect, useState } from "react";
import {
  aprobarActaObservada,
  getActasObservadas,
  rechazarActaObservada,
} from "../../services/oficialService";
import { getCurrentUser } from "../../utils/auth";
import "./ObservadasPage.css";

function formatHour(hour, minutes) {
  if (hour === null || hour === undefined) return "Sin hora";
  return `${hour}:${String(minutes ?? 0).padStart(2, "0")}`;
}

function ObservadasPage() {
  const [actas, setActas] = useState([]);
  const [selectedActa, setSelectedActa] = useState(null);
  const [search, setSearch] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("TODAS");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [comentario, setComentario] = useState("");
  const [processing, setProcessing] = useState(false);

  const currentUser = getCurrentUser();

  async function loadActas() {
    setLoading(true);
    setErrorMessage("");

    const response = await getActasObservadas();

    if (!response.ok) {
      setErrorMessage(
        response.message || "No se pudieron cargar las actas observadas."
      );
      setLoading(false);
      return;
    }

    setActas(response.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadActas();
  }, []);

  const tipos = Array.from(
    new Set(actas.map((acta) => acta.tipo_observacion).filter(Boolean))
  );

  const filteredActas = actas.filter((acta) => {
    const searchValue = search.trim().toLowerCase();

    const matchesSearch =
      !searchValue ||
      String(acta.codigo_acta).toLowerCase().includes(searchValue) ||
      String(acta.departamento || "").toLowerCase().includes(searchValue) ||
      String(acta.provincia || "").toLowerCase().includes(searchValue) ||
      String(acta.municipio || "").toLowerCase().includes(searchValue) ||
      String(acta.nombre_recinto || "").toLowerCase().includes(searchValue) ||
      String(acta.tipo_observacion || "").toLowerCase().includes(searchValue) ||
      String(acta.motivo_observacion || "").toLowerCase().includes(searchValue);

    const matchesTipo =
      tipoFiltro === "TODAS" || acta.tipo_observacion === tipoFiltro;

    return matchesSearch && matchesTipo;
  });

  async function handleAprobar() {
    if (!selectedActa) return;

    if (!currentUser?.username) {
      alert("Debe iniciar sesión para aprobar actas.");
      return;
    }

    setProcessing(true);

    const response = await aprobarActaObservada(
      selectedActa.codigo_acta,
      comentario,
      currentUser.username
    );

    setProcessing(false);

    if (!response.ok) {
      alert(response.message || "No se pudo aprobar el acta.");
      return;
    }

    setActas((prev) =>
      prev.filter((item) => item.codigo_acta !== selectedActa.codigo_acta)
    );

    setSelectedActa(null);
    setComentario("");
  }

  async function handleRechazar() {
    if (!selectedActa) return;

    if (!currentUser?.username) {
      alert("Debe iniciar sesión para rechazar actas.");
      return;
    }

    setProcessing(true);

    const response = await rechazarActaObservada(
      selectedActa.codigo_acta,
      comentario,
      currentUser.username
    );

    setProcessing(false);

    if (!response.ok) {
      alert(response.message || "No se pudo rechazar el acta.");
      return;
    }

    setActas((prev) =>
      prev.filter((item) => item.codigo_acta !== selectedActa.codigo_acta)
    );

    setSelectedActa(null);
    setComentario("");
  }

  if (loading) {
    return (
      <div className="obs-loading-box">
        <svg className="obs-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
        <span>Recopilando actas con observaciones...</span>
      </div>
    );
  }

  if (errorMessage) {
    return <div className="obs-error-box">{errorMessage}</div>;
  }

  return (
    <div className="obs-root">
      <header className="obs-header">
        <h2 className="page-title">Bandeja de Revisión</h2>
        <p className="page-description">
          Actas que el sistema ha marcado con inconsistencias. Requieren intervención manual para su resolución.
        </p>
      </header>

      {/* Alerta de Usuario Estilizada */}
      <div className="obs-user-warning animate-fade-in">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>Sesión activa de revisión: <b>{currentUser?.username || "Invitado"}</b></span>
      </div>

      {/* Barra de Herramientas y KPIs */}
      <section className="obs-control-panel">
        <div className="obs-summary">
          <div className="obs-summary-card">
            <div className="kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="12" y1="18" x2="12" y2="18"></line></svg></div>
            <div>
              <span>Pendientes Totales</span>
              <strong>{actas.length}</strong>
            </div>
          </div>
          <div className="obs-summary-card">
            <div className="kpi-icon highlight"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg></div>
            <div>
              <span>Vista Actual (Filtro)</span>
              <strong>{filteredActas.length}</strong>
            </div>
          </div>
        </div>

        <div className="obs-toolbar">
          <div className="obs-search-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              className="obs-search"
              type="text"
              placeholder="Buscar por código, ubicación o problema..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="obs-select-wrapper">
            <select
              className="obs-select"
              value={tipoFiltro}
              onChange={(event) => setTipoFiltro(event.target.value)}
            >
              <option value="TODAS">Todas las observaciones</option>
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          <button className="obs-button" onClick={loadActas}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path><path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path></svg>
            Actualizar
          </button>
        </div>
      </section>

      {/* Tabla Premium (Estilo OficialPage) */}
      <section className="obs-table-section">
        <div className="table-wrapper custom-scrollbar">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código Acta</th>
                <th>Ubicación (Dept / Prov / Mun)</th>
                <th>Recinto</th>
                <th className="text-center">Mesa</th>
                <th>Problema Detectado</th>
                <th className="text-right">Acción</th>
              </tr>
            </thead>

            <tbody>
              {filteredActas.map((acta) => (
                <tr key={acta.id_observada || acta.codigo_acta}>
                  <td className="obs-mono">{acta.codigo_acta}</td>
                  <td>
                    <div className="location-stack">
                      <b>{acta.departamento || "N/A"}</b>
                      <span>{acta.provincia} • {acta.municipio}</span>
                    </div>
                  </td>
                  <td className="obs-truncate" title={acta.nombre_recinto}>{acta.nombre_recinto || "No encontrado"}</td>
                  <td className="text-center"><strong>{acta.nro_mesa || "-"}</strong></td>
                  <td>
                    <span className="obs-badge badge-warning" title={acta.motivo_observacion}>
                      {acta.tipo_observacion || "OBSERVADA"}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      className="obs-review-button"
                      onClick={() => {
                        setSelectedActa(acta);
                        setComentario("");
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      Revisar
                    </button>
                  </td>
                </tr>
              ))}

              {filteredActas.length === 0 && (
                <tr>
                  <td colSpan="6" className="obs-empty-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    No hay actas observadas que coincidan con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Resolución (Nivel Auditoría) */}
      {selectedActa && (
        <div className="obs-modal-backdrop animate-fade-in">
          <div className="obs-modal">
            <div className="obs-modal-header">
              <div className="obs-modal-title-group">
                <div className="obs-modal-icon warning-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <div>
                  <h3>Resolución de Acta</h3>
                  <p>ID de Sistema: <span className="obs-mono">{selectedActa.codigo_acta}</span></p>
                </div>
              </div>
              <button className="obs-modal-close" onClick={() => setSelectedActa(null)} title="Cerrar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="obs-modal-body custom-scrollbar">
              {/* ALERTA DEL PROBLEMA - Destacado en la parte superior */}
              <div className="obs-problem-alert">
                <h4>Detalle de la Observación</h4>
                <div className="problem-details">
                  <p><strong>Tipo:</strong> {selectedActa.tipo_observacion}</p>
                  <p><strong>Motivo del Sistema:</strong> {selectedActa.motivo_observacion}</p>
                  {selectedActa.observaciones && (
                    <p><strong>Nota del Operador:</strong> {selectedActa.observaciones}</p>
                  )}
                  <p className="problem-meta">Registrado el {selectedActa.fecha_registro ? new Date(selectedActa.fecha_registro).toLocaleString() : "Sin fecha"}</p>
                </div>
              </div>

              <div className="obs-modal-grid">
                <section className="obs-modal-section">
                  <h4>Ubicación de la Mesa</h4>
                  <div className="modal-data-list">
                    <div className="data-row"><span>Departamento:</span> <b>{selectedActa.departamento || "N/A"}</b></div>
                    <div className="data-row"><span>Provincia:</span> <b>{selectedActa.provincia || "N/A"}</b></div>
                    <div className="data-row"><span>Municipio:</span> <b>{selectedActa.municipio || "N/A"}</b></div>
                    <div className="data-row highlight-row"><span>Recinto:</span> <b>{selectedActa.nombre_recinto || "N/A"}</b></div>
                    <div className="data-row big-row"><span>Nro. de Mesa:</span> <strong>{selectedActa.nro_mesa || "N/A"}</strong></div>
                  </div>
                </section>

                <section className="obs-modal-section">
                  <h4>Cuadratura del Acta</h4>
                  <div className="modal-data-list">
                    <div className="data-row"><span>Habilitados:</span> <b>{selectedActa.votantes_habilitados}</b></div>
                    <div className="data-row"><span>En Ánfora:</span> <b>{selectedActa.papeletas_anfora}</b></div>
                    <div className="data-row"><span>No Utilizadas:</span> <b>{selectedActa.papeletas_no_utilizadas}</b></div>
                    <hr className="modal-divider"/>
                    <div className="data-row"><span>Votos Válidos:</span> <strong>{selectedActa.votos_validos}</strong></div>
                    <div className="data-row"><span>Blancos:</span> <strong>{selectedActa.votos_blancos}</strong></div>
                    <div className="data-row"><span>Nulos:</span> <strong>{selectedActa.votos_nulos}</strong></div>
                  </div>
                </section>

                <section className="obs-modal-section full-width">
                  <h4>Distribución de Votos</h4>
                  <div className="obs-votes-grid">
                    <div className="vote-box vote-p1"><span>P1</span><strong>{selectedActa.p1}</strong></div>
                    <div className="vote-box vote-p2"><span>P2</span><strong>{selectedActa.p2}</strong></div>
                    <div className="vote-box vote-p3"><span>P3</span><strong>{selectedActa.p3}</strong></div>
                    <div className="vote-box vote-p4"><span>P4</span><strong>{selectedActa.p4}</strong></div>
                  </div>
                </section>
              </div>

              {/* Caja de Decisión Final */}
              <div className="obs-decision-area">
                <div className="obs-comment-box">
                  <label htmlFor="resolucion_comment">Justificación de Resolución (Obligatorio para rechazar)</label>
                  <textarea
                    id="resolucion_comment"
                    value={comentario}
                    onChange={(event) => setComentario(event.target.value)}
                    placeholder="Escriba los motivos de la aprobación o rechazo de esta acta..."
                  />
                </div>

                <div className="obs-modal-actions">
                  <button className="obs-btn-reject" onClick={handleRechazar} disabled={processing}>
                    {processing ? "Procesando..." : "Anular / Rechazar Acta"}
                  </button>
                  <button className="obs-btn-approve" onClick={handleAprobar} disabled={processing}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    {processing ? "Guardando..." : "Validar e Integrar al Conteo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ObservadasPage;