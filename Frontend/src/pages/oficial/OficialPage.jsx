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

function OficialPage() {
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
    return <div className="loading-box">Cargando actas oficiales...</div>;
  }

  if (errorMessage) {
    return <div className="error-box">{errorMessage}</div>;
  }

  return (
    <div className="ofi-root">
      <h2 className="page-title">Actas oficiales</h2>

      <p className="page-description">
        Selecciona departamento, provincia, municipio y recinto para ver las
        mesas oficiales registradas.
      </p>

      <div className="ofi-filters">
        <div className="ofi-filter">
          <label>Departamento</label>
          <select
            value={departamento}
            onChange={(event) => handleDepartamentoChange(event.target.value)}
          >
            <option value="">Seleccionar departamento</option>
            {departamentos.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="ofi-filter">
          <label>Provincia</label>
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

        <div className="ofi-filter">
          <label>Municipio</label>
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

        <div className="ofi-filter">
          <label>Recinto</label>
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

      {recinto && (
        <div className="ofi-selected-recinto">
          <h3>Mesas del recinto seleccionado</h3>
          <p>
            Total de mesas oficiales encontradas:{" "}
            <b>{mesasFiltradas.length}</b>
          </p>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Código acta</th>
              <th>Mesa</th>
              <th>Recinto</th>
              <th>Válidos</th>
              <th>Blancos</th>
              <th>Nulos</th>
              <th>P1</th>
              <th>P2</th>
              <th>P3</th>
              <th>P4</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {mesasFiltradas.map((acta) => (
              <tr key={acta.codigo_acta}>
                <td>{acta.codigo_acta}</td>
                <td>{acta.nro_mesa}</td>
                <td>{acta.nombre_recinto}</td>
                <td>{acta.votos_validos}</td>
                <td>{acta.votos_blancos}</td>
                <td>{acta.votos_nulos}</td>
                <td>{acta.p1}</td>
                <td>{acta.p2}</td>
                <td>{acta.p3}</td>
                <td>{acta.p4}</td>
                <td>
                  <button
                    className="ofi-review-button"
                    onClick={() => setSelectedActa(acta)}
                  >
                    Ver acta
                  </button>
                </td>
              </tr>
            ))}

            {mesasFiltradas.length === 0 && (
              <tr>
                <td colSpan="11">
                  Selecciona un recinto para ver sus mesas oficiales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedActa && (
        <div className="ofi-modal-backdrop">
          <div className="ofi-modal">
            <div className="ofi-modal-header">
              <div>
                <h3>Detalle de acta oficial</h3>
                <p>Código: {selectedActa.codigo_acta}</p>
              </div>

              <button
                className="ofi-modal-close"
                onClick={() => setSelectedActa(null)}
              >
                ×
              </button>
            </div>

            <div className="ofi-modal-grid">
              <section>
                <h4>Ubicación</h4>
                <p>
                  <b>Departamento:</b> {selectedActa.departamento}
                </p>
                <p>
                  <b>Provincia:</b> {selectedActa.provincia}
                </p>
                <p>
                  <b>Municipio:</b> {selectedActa.municipio}
                </p>
                <p>
                  <b>Recinto:</b> {selectedActa.nombre_recinto}
                </p>
                <p>
                  <b>Dirección:</b> {selectedActa.direccion_recinto}
                </p>
                <p>
                  <b>Mesa:</b> {selectedActa.nro_mesa}
                </p>
              </section>

              <section>
                <h4>Datos del acta</h4>
                <p>
                  <b>Votantes habilitados:</b>{" "}
                  {selectedActa.votantes_habilitados}
                </p>
                <p>
                  <b>Papeletas ánfora:</b> {selectedActa.papeletas_anfora}
                </p>
                <p>
                  <b>No utilizadas:</b> {selectedActa.papeletas_no_utilizadas}
                </p>
                <p>
                  <b>Votos válidos:</b> {selectedActa.votos_validos}
                </p>
                <p>
                  <b>Blancos:</b> {selectedActa.votos_blancos}
                </p>
                <p>
                  <b>Nulos:</b> {selectedActa.votos_nulos}
                </p>
              </section>

              <section>
                <h4>Horario</h4>
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
                <p>
                  <b>Fecha procesamiento:</b>{" "}
                  {selectedActa.fecha_procesamiento
                    ? new Date(
                        selectedActa.fecha_procesamiento
                      ).toLocaleString()
                    : "Sin fecha"}
                </p>
              </section>

              <section>
                <h4>Votos por partido</h4>
                <div className="ofi-votes-grid">
                  <div className="vote-box vote-p1">P1: {selectedActa.p1}</div>
                  <div className="vote-box vote-p2">P2: {selectedActa.p2}</div>
                  <div className="vote-box vote-p3">P3: {selectedActa.p3}</div>
                  <div className="vote-box vote-p4">P4: {selectedActa.p4}</div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OficialPage;