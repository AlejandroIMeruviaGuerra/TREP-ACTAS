import { useEffect, useMemo, useState } from "react";
import { getActasOficialesDetalle } from "../../services/oficialService";
import "./OficialPage.css";

function uniqueValues(items, key) {
  return Array.from(new Set(items.map((item) => item[key]).filter(Boolean))).sort();
}

function formatHour(hour, minutes) {
  if (hour === null || hour === undefined) return "Sin hora";
  return `${hour}:${String(minutes ?? 0).padStart(2, "0")}`;
}

function OficialPage({ onCreate }) {  // ← AGREGADO: Recibir onCreate como prop
  const [actas, setActas] = useState([]);
  const [selectedActa, setSelectedActa] = useState(null);

  const [departamento, setDepartamento] = useState("");
  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [recinto, setRecinto] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadActas() {
    setLoading(true);
    setErrorMessage("");

    const response = await getActasOficialesDetalle();

    if (!response.ok) {
      setErrorMessage(
        response.message || "No se pudieron cargar las actas oficiales."
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

  const departamentos = useMemo(
    () => uniqueValues(actas, "departamento"),
    [actas]
  );

  const provincias = useMemo(() => {
    return uniqueValues(
      actas.filter((item) => item.departamento === departamento),
      "provincia"
    );
  }, [actas, departamento]);

  const municipios = useMemo(() => {
    return uniqueValues(
      actas.filter(
        (item) =>
          item.departamento === departamento && item.provincia === provincia
      ),
      "municipio"
    );
  }, [actas, departamento, provincia]);

  const recintos = useMemo(() => {
    const filtered = actas.filter(
      (item) =>
        item.departamento === departamento &&
        item.provincia === provincia &&
        item.municipio === municipio
    );

    const map = new Map();

    filtered.forEach((item) => {
      if (item.codigo_recinto) {
        map.set(item.codigo_recinto, {
          codigo_recinto: item.codigo_recinto,
          nombre_recinto: item.nombre_recinto,
          direccion_recinto: item.direccion_recinto,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      String(a.nombre_recinto).localeCompare(String(b.nombre_recinto))
    );
  }, [actas, departamento, provincia, municipio]);

  const mesasFiltradas = useMemo(() => {
    if (!recinto) return [];

    return actas
      .filter((item) => String(item.codigo_recinto) === String(recinto))
      .sort((a, b) => Number(a.nro_mesa || 0) - Number(b.nro_mesa || 0));
  }, [actas, recinto]);

  function handleDepartamentoChange(value) {
    setDepartamento(value);
    setProvincia("");
    setMunicipio("");
    setRecinto("");
  }

  function handleProvinciaChange(value) {
    setProvincia(value);
    setMunicipio("");
    setRecinto("");
  }

  function handleMunicipioChange(value) {
    setMunicipio(value);
    setRecinto("");
  }

  if (loading) {
    return (
      <div className="ofi-loading-box">
        <svg className="ofi-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
        <span>Recuperando archivo de actas oficiales...</span>
      </div>
    );
  }

  if (errorMessage) {
    return <div className="ofi-error-box">{errorMessage}</div>;
  }

  return (
    <div className="ofi-root">
      <header className="ofi-header">
        <div className="ofi-header-content">  {/* ← AGREGADO: Wrapper para flex */}
          <div>
            <h2 className="page-title">Archivo Oficial de Actas</h2>
            <p className="page-description">Buscador y visor detallado de mesas procesadas e integradas al escrutinio final.</p>
          </div>
          
          {/* ← AGREGADO: Botón Crear Acta */}
          {onCreate && (
            <button 
              className="ofi-create-button" 
              onClick={onCreate}
              title="Crear nueva acta oficial"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Crear acta</span>
            </button>
          )}
        </div>
      </header>

      {/* Panel de Filtros Estilizado */}
      <section className="ofi-control-panel">
        <div className="ofi-filters">
          <div className="ofi-filter">
            <label>Departamento</label>
            <div className="ofi-select-wrapper">
              <select
                value={departamento}
                onChange={(event) => handleDepartamentoChange(event.target.value)}
              >
                <option value="">Todos los departamentos</option>
                {departamentos.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ofi-filter">
            <label>Provincia</label>
            <div className="ofi-select-wrapper">
              <select
                value={provincia}
                disabled={!departamento}
                onChange={(event) => handleProvinciaChange(event.target.value)}
              >
                <option value="">Seleccionar provincia</option>
                {provincias.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ofi-filter">
            <label>Municipio</label>
            <div className="ofi-select-wrapper">
              <select
                value={municipio}
                disabled={!provincia}
                onChange={(event) => handleMunicipioChange(event.target.value)}
              >
                <option value="">Seleccionar municipio</option>
                {municipios.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ofi-filter">
            <label>Recinto Electoral</label>
            <div className="ofi-select-wrapper">
              <select
                value={recinto}
                disabled={!municipio}
                onChange={(event) => setRecinto(event.target.value)}
              >
                <option value="">Seleccionar recinto</option>
                {recintos.map((item) => (
                  <option key={item.codigo_recinto} value={item.codigo_recinto}>
                    {item.nombre_recinto}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {recinto && (
        <div className="ofi-selected-recinto animate-fade-in">
          <div className="recinto-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <div>
              <h3>Recinto Activo</h3>
              <p>Has seleccionado un recinto con <b>{mesasFiltradas.length}</b> mesa(s) oficial(es) registrada(s).</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Datos Nivel Premium */}
      <section className="ofi-table-section">
        <div className="table-wrapper custom-scrollbar">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código Acta</th>
                <th>Mesa</th>
                <th>Recinto</th>
                <th className="text-center">Válidos</th>
                <th className="text-center">Blancos</th>
                <th className="text-center">Nulos</th>
                <th className="text-center">P1</th>
                <th className="text-center">P2</th>
                <th className="text-center">P3</th>
                <th className="text-center">P4</th>
                <th className="text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {mesasFiltradas.map((acta) => (
                <tr key={acta.codigo_acta}>
                  <td className="ofi-mono">{acta.codigo_acta}</td>
                  <td><strong>{acta.nro_mesa}</strong></td>
                  <td className="ofi-truncate" title={acta.nombre_recinto}>{acta.nombre_recinto}</td>
                  <td className="text-center"><span className="ofi-badge badge-success">{acta.votos_validos}</span></td>
                  <td className="text-center"><span className="ofi-badge badge-neutral">{acta.votos_blancos}</span></td>
                  <td className="text-center"><span className="ofi-badge badge-danger">{acta.votos_nulos}</span></td>
                  <td className="text-center"><b>{acta.p1}</b></td>
                  <td className="text-center"><b>{acta.p2}</b></td>
                  <td className="text-center"><b>{acta.p3}</b></td>
                  <td className="text-center"><b>{acta.p4}</b></td>
                  <td className="text-right">
                    <button className="ofi-review-button" onClick={() => setSelectedActa(acta)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      Inspeccionar
                    </button>
                  </td>
                </tr>
              ))}
              {mesasFiltradas.length === 0 && (
                <tr>
                  <td colSpan="11" className="ofi-empty-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                    Utiliza los filtros superiores para cargar las actas de un recinto específico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Auditoría */}
      {selectedActa && (
        <div className="ofi-modal-backdrop animate-fade-in">
          <div className="ofi-modal">
            <div className="ofi-modal-header">
              <div className="ofi-modal-title-group">
                <div className="ofi-modal-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <div>
                  <h3>Auditoría de Acta Oficial</h3>
                  <p>ID de Sistema: <span className="ofi-mono">{selectedActa.codigo_acta}</span></p>
                </div>
              </div>
              <button className="ofi-modal-close" onClick={() => setSelectedActa(null)} title="Cerrar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="ofi-modal-grid">
              {/* Bloque 1 */}
              <section className="modal-section">
                <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Ubicación de la Mesa</h4>
                <div className="modal-data-list">
                  <div className="data-row"><span>Departamento:</span> <b>{selectedActa.departamento}</b></div>
                  <div className="data-row"><span>Provincia:</span> <b>{selectedActa.provincia}</b></div>
                  <div className="data-row"><span>Municipio:</span> <b>{selectedActa.municipio}</b></div>
                  <div className="data-row highlight-row"><span>Recinto:</span> <b>{selectedActa.nombre_recinto}</b></div>
                  <div className="data-row"><span>Dirección:</span> <b className="truncate-text" title={selectedActa.direccion_recinto}>{selectedActa.direccion_recinto}</b></div>
                  <div className="data-row big-row"><span>Nro. de Mesa:</span> <strong>{selectedActa.nro_mesa}</strong></div>
                </div>
              </section>

              {/* Bloque 2 */}
              <section className="modal-section">
                <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Cuadratura del Acta</h4>
                <div className="modal-data-list">
                  <div className="data-row"><span>Votantes Habilitados:</span> <b>{selectedActa.votantes_habilitados}</b></div>
                  <div className="data-row"><span>Papeletas en Ánfora:</span> <b>{selectedActa.papeletas_anfora}</b></div>
                  <div className="data-row"><span>Papeletas No Utilizadas:</span> <b>{selectedActa.papeletas_no_utilizadas}</b></div>
                  <hr className="modal-divider"/>
                  <div className="data-row text-success"><span>Votos Válidos:</span> <strong>{selectedActa.votos_validos}</strong></div>
                  <div className="data-row text-neutral"><span>Votos Blancos:</span> <strong>{selectedActa.votos_blancos}</strong></div>
                  <div className="data-row text-danger"><span>Votos Nulos:</span> <strong>{selectedActa.votos_nulos}</strong></div>
                </div>
              </section>

              {/* Bloque 3 */}
              <section className="modal-section">
                <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Tiempos y Registro</h4>
                <div className="modal-data-list">
                  <div className="data-row"><span>Apertura de Mesa:</span> <b>{formatHour(selectedActa.apertura_hora, selectedActa.apertura_minutos)} hrs</b></div>
                  <div className="data-row"><span>Cierre de Mesa:</span> <b>{formatHour(selectedActa.cierre_hora, selectedActa.cierre_minutos)} hrs</b></div>
                  <div className="data-row">
                    <span>Fecha Procesamiento:</span> 
                    <b>{selectedActa.fecha_procesamiento ? new Date(selectedActa.fecha_procesamiento).toLocaleString() : "Sin registro"}</b>
                  </div>
                </div>
              </section>

              {/* Bloque 4 */}
              <section className="modal-section">
                <h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-6M6 20V10M18 20V4"></path></svg> Votos por Partido</h4>
                <div className="ofi-votes-grid">
                  <div className="vote-box vote-p1">
                    <span>Partido 1</span>
                    <strong>{selectedActa.p1}</strong>
                  </div>
                  <div className="vote-box vote-p2">
                    <span>Partido 2</span>
                    <strong>{selectedActa.p2}</strong>
                  </div>
                  <div className="vote-box vote-p3">
                    <span>Partido 3</span>
                    <strong>{selectedActa.p3}</strong>
                  </div>
                  <div className="vote-box vote-p4">
                    <span>Partido 4</span>
                    <strong>{selectedActa.p4}</strong>
                  </div>
                </div>
              </section>
            </div>
            
            <div className="ofi-modal-footer">
              <button className="ofi-btn-secondary" onClick={() => setSelectedActa(null)}>Cerrar Inspección</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OficialPage;