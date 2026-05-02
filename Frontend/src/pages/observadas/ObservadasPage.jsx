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
      String(acta.motivo_observacion || "")
        .toLowerCase()
        .includes(searchValue);

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
    return <div className="loading-box">Cargando actas observadas...</div>;
  }

  if (errorMessage) {
    return <div className="error-box">{errorMessage}</div>;
  }

  return (
    <div className="obs-root">
      <h2 className="page-title">Actas observadas</h2>

      <p className="page-description">
        Actas que requieren revisión manual. Para aprobar o rechazar se debe
        tener una sesión activa.
      </p>

      <div className="obs-user-warning">
        Usuario revisor activo: <b>{currentUser?.username}</b>
      </div>

      <div className="obs-toolbar">
        <input
          className="obs-search"
          type="text"
          placeholder="Buscar por código, departamento, provincia, municipio, recinto o problema..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          className="obs-select"
          value={tipoFiltro}
          onChange={(event) => setTipoFiltro(event.target.value)}
        >
          <option value="TODAS">Todas las observaciones</option>
          {tipos.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>

        <button className="obs-button" onClick={loadActas}>
          Actualizar
        </button>
      </div>

      <div className="obs-summary">
        <div className="obs-summary-card">
          <span>Total pendientes</span>
          <strong>{actas.length}</strong>
        </div>

        <div className="obs-summary-card">
          <span>Filtradas</span>
          <strong>{filteredActas.length}</strong>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código acta</th>
              <th>Departamento</th>
              <th>Provincia</th>
              <th>Municipio</th>
              <th>Recinto</th>
              <th>Mesa</th>
              <th>Problema</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {filteredActas.map((acta) => (
              <tr key={acta.id_observada || acta.codigo_acta}>
                <td>{acta.codigo_acta}</td>
                <td>{acta.departamento || "Sin departamento"}</td>
                <td>{acta.provincia || "Sin provincia"}</td>
                <td>{acta.municipio || "Sin municipio"}</td>
                <td>{acta.nombre_recinto || "No encontrado"}</td>
                <td>{acta.nro_mesa || "Sin mesa"}</td>
                <td>
                  <span className="badge badge-warning">
                    {acta.tipo_observacion || "OBSERVADA"}
                  </span>
                </td>
                <td>
                  <button
                    className="obs-review-button"
                    onClick={() => {
                      setSelectedActa(acta);
                      setComentario("");
                    }}
                  >
                    Revisar
                  </button>
                </td>
              </tr>
            ))}

            {filteredActas.length === 0 && (
              <tr>
                <td colSpan="8">No hay actas observadas pendientes.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedActa && (
        <div className="obs-modal-backdrop">
          <div className="obs-modal">
            <div className="obs-modal-header">
              <div>
                <h3>Revisión de acta observada</h3>
                <p>Código de acta: {selectedActa.codigo_acta}</p>
              </div>

              <button
                className="obs-modal-close"
                onClick={() => setSelectedActa(null)}
              >
                ×
              </button>
            </div>

            <div className="obs-modal-grid">
              <section className="obs-modal-section">
                <h4>Ubicación</h4>
                <p>
                  <b>Departamento:</b>{" "}
                  {selectedActa.departamento || "No definido"}
                </p>
                <p>
                  <b>Provincia:</b> {selectedActa.provincia || "No definido"}
                </p>
                <p>
                  <b>Municipio:</b> {selectedActa.municipio || "No definido"}
                </p>
                <p>
                  <b>Código territorial:</b>{" "}
                  {selectedActa.codigo_territorial || "No definido"}
                </p>
                <p>
                  <b>Recinto:</b>{" "}
                  {selectedActa.nombre_recinto || "No encontrado"}
                </p>
                <p>
                  <b>Dirección:</b>{" "}
                  {selectedActa.direccion_recinto || "Sin dirección"}
                </p>
                <p>
                  <b>Código recinto:</b>{" "}
                  {selectedActa.codigo_recinto || "No definido"}
                </p>
                <p>
                  <b>Nro mesa:</b> {selectedActa.nro_mesa || "No definido"}
                </p>
              </section>

              <section className="obs-modal-section">
                <h4>Datos del acta</h4>
                <p>
                  <b>Votantes habilitados:</b>{" "}
                  {selectedActa.votantes_habilitados}
                </p>
                <p>
                  <b>Papeletas ánfora:</b> {selectedActa.papeletas_anfora}
                </p>
                <p>
                  <b>Papeletas no utilizadas:</b>{" "}
                  {selectedActa.papeletas_no_utilizadas}
                </p>
                <p>
                  <b>Votos válidos:</b> {selectedActa.votos_validos}
                </p>
                <p>
                  <b>Votos blancos:</b> {selectedActa.votos_blancos}
                </p>
                <p>
                  <b>Votos nulos:</b> {selectedActa.votos_nulos}
                </p>
                <p>
                  <b>Apertura:</b>{" "}
                  {formatHour(
                    selectedActa.apertura_hora,
                    selectedActa.apertura_minutos
                  )}
                </p>
                <p>
                  <b>Cierre:</b>{" "}
                  {formatHour(
                    selectedActa.cierre_hora,
                    selectedActa.cierre_minutos
                  )}
                </p>
              </section>

              <section className="obs-modal-section">
                <h4>Votos por partido</h4>
                <div className="obs-votes-grid">
                  <div className="vote-box vote-p1">P1: {selectedActa.p1}</div>
                  <div className="vote-box vote-p2">P2: {selectedActa.p2}</div>
                  <div className="vote-box vote-p3">P3: {selectedActa.p3}</div>
                  <div className="vote-box vote-p4">P4: {selectedActa.p4}</div>
                </div>
              </section>

              <section className="obs-modal-section obs-problem">
                <h4>Problema detectado</h4>
                <p>
                  <b>Tipo:</b> {selectedActa.tipo_observacion}
                </p>
                <p>
                  <b>Motivo:</b> {selectedActa.motivo_observacion}
                </p>
                <p>
                  <b>Observación original:</b>{" "}
                  {selectedActa.observaciones || "Sin observación textual"}
                </p>
                <p>
                  <b>Fecha registro:</b>{" "}
                  {selectedActa.fecha_registro
                    ? new Date(selectedActa.fecha_registro).toLocaleString()
                    : "Sin fecha"}
                </p>
                <p>
                  <b>Revisor:</b> {currentUser?.username}
                </p>
              </section>
            </div>

            <div className="obs-comment-box">
              <label>Comentario de revisión</label>
              <textarea
                value={comentario}
                onChange={(event) => setComentario(event.target.value)}
                placeholder="Escribe una justificación breve para aprobar o rechazar..."
              />
            </div>

            <div className="obs-modal-actions">
              <button
                className="obs-reject"
                onClick={handleRechazar}
                disabled={processing}
              >
                Rechazar
              </button>

              <button
                className="obs-approve"
                onClick={handleAprobar}
                disabled={processing}
              >
                Aprobar y pasar a oficiales
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ObservadasPage;