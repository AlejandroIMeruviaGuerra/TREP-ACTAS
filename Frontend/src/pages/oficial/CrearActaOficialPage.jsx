import { useEffect, useMemo, useState } from "react";
import {
  crearMesaYActaOficial,
  getCatalogoOficial,
} from "../../services/oficialService";
import { getCurrentUser } from "../../utils/auth";
import "./CrearActaOficialPage.css";

const initialForm = {
  departamento: "",
  provincia: "",
  municipio: "",
  codigo_recinto: "",
  p1: "",
  p2: "",
  p3: "",
  p4: "",
  votos_blancos: "",
  votos_nulos: "",
  apertura_hora: "8",
  apertura_minutos: "0",
  cierre_hora: "16",
  cierre_minutos: "0",
  observaciones: "",
};

const camposAsignacion = [
  "p1",
  "p2",
  "p3",
  "p4",
  "votos_blancos",
  "votos_nulos",
];

function toNumber(value) {
  return Number(value || 0);
}

function uniqueValues(items) {
  return Array.from(new Set(items.filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b))
  );
}

function CrearActaOficialPage({ onBack }) {
  const [form, setForm] = useState(initialForm);
  const [recintos, setRecintos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [codigoBusqueda, setCodigoBusqueda] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const currentUser = getCurrentUser();

  async function loadCatalogo() {
    setLoading(true);

    const response = await getCatalogoOficial();

    if (!response.ok) {
      setMessage(response.message || "No se pudo cargar el catálogo.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    setRecintos(response.data?.recintos || []);
    setMesas(response.data?.mesas || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCatalogo();
  }, []);

  const departamentos = useMemo(() => {
    return uniqueValues(recintos.map((item) => item.departamento));
  }, [recintos]);

  const municipios = useMemo(() => {
    return uniqueValues(
      recintos
        .filter((item) => item.departamento === form.departamento)
        .map((item) => item.municipio)
    );
  }, [recintos, form.departamento]);

  const provincias = useMemo(() => {
    return uniqueValues(
      recintos
        .filter(
          (item) =>
            item.departamento === form.departamento &&
            item.municipio === form.municipio
        )
        .map((item) => item.provincia)
    );
  }, [recintos, form.departamento, form.municipio]);

  const recintosFiltrados = useMemo(() => {
    return recintos.filter(
      (item) =>
        item.departamento === form.departamento &&
        item.municipio === form.municipio &&
        item.provincia === form.provincia
    );
  }, [recintos, form.departamento, form.municipio, form.provincia]);

  const recintoSeleccionado = useMemo(() => {
    return recintos.find(
      (item) => String(item.codigo_recinto) === String(form.codigo_recinto)
    );
  }, [recintos, form.codigo_recinto]);

  const mesasFiltradas = useMemo(() => {
    if (!form.codigo_recinto) return [];

    return mesas
      .filter(
        (mesa) => String(mesa.codigo_recinto) === String(form.codigo_recinto)
      )
      .sort((a, b) => Number(a.nro_mesa || 0) - Number(b.nro_mesa || 0));
  }, [mesas, form.codigo_recinto]);

  const votantesHabilitados = Number(
    mesaSeleccionada?.votantes_habilitados || 0
  );

  const mesaTieneTranscripcion =
    mesaSeleccionada?.tiene_transcripcion ||
    mesaSeleccionada?.estado_transcripcion === "CON_TRANSCRIPCION";

  const puedeAsignarVotos =
    mesaSeleccionada && !mesaTieneTranscripcion && votantesHabilitados > 0;

  const votosValidosCalculados =
    toNumber(form.p1) +
    toNumber(form.p2) +
    toNumber(form.p3) +
    toNumber(form.p4);

  const papeletasAnforaCalculada =
    votosValidosCalculados +
    toNumber(form.votos_blancos) +
    toNumber(form.votos_nulos);

  const papeletasNoUtilizadasCalculada =
    votantesHabilitados - papeletasAnforaCalculada;

  const puntosDisponibles =
    votantesHabilitados - papeletasAnforaCalculada >= 0
      ? votantesHabilitados - papeletasAnforaCalculada
      : 0;

  function limpiarDatosActa() {
    setForm((prev) => ({
      ...prev,
      p1: "",
      p2: "",
      p3: "",
      p4: "",
      votos_blancos: "",
      votos_nulos: "",
      observaciones: "",
    }));
  }

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleDepartamentoChange(value) {
    setForm((prev) => ({
      ...prev,
      departamento: value,
      municipio: "",
      provincia: "",
      codigo_recinto: "",
    }));

    setMesaSeleccionada(null);
    limpiarDatosActa();
  }

  function handleMunicipioChange(value) {
    setForm((prev) => ({
      ...prev,
      municipio: value,
      provincia: "",
      codigo_recinto: "",
    }));

    setMesaSeleccionada(null);
    limpiarDatosActa();
  }

  function handleProvinciaChange(value) {
    setForm((prev) => ({
      ...prev,
      provincia: value,
      codigo_recinto: "",
    }));

    setMesaSeleccionada(null);
    limpiarDatosActa();
  }

  function handleRecintoChange(value) {
    setForm((prev) => ({
      ...prev,
      codigo_recinto: value,
    }));

    setMesaSeleccionada(null);
    limpiarDatosActa();
  }

  function seleccionarMesa(mesa) {
    setMesaSeleccionada(mesa);
    setMessage("");
    setMessageType("");
    limpiarDatosActa();
  }

  function buscarPorCodigoActa() {
    const codigoLimpio = codigoBusqueda.trim();

    if (!codigoLimpio) {
      setMessage("Ingresa un código de acta para buscar.");
      setMessageType("error");
      return;
    }

    const mesaEncontrada = mesas.find(
      (mesa) => String(mesa.codigo_acta) === codigoLimpio
    );

    if (!mesaEncontrada) {
      setMesaSeleccionada(null);
      setMessage("No se encontró una mesa con ese código de acta.");
      setMessageType("error");
      return;
    }

    setForm((prev) => ({
      ...prev,
      departamento: mesaEncontrada.departamento,
      municipio: mesaEncontrada.municipio,
      provincia: mesaEncontrada.provincia,
      codigo_recinto: String(mesaEncontrada.codigo_recinto),
    }));

    seleccionarMesa(mesaEncontrada);

    setMessage(
      `Mesa encontrada: recinto ${mesaEncontrada.nombre_recinto}, mesa ${mesaEncontrada.nro_mesa}.`
    );
    setMessageType("success");
  }

  function handleAsignacionChange(field, value) {
    if (!puedeAsignarVotos) return;

    const numericValue = Math.max(0, Number(value || 0));

    setForm((prev) => {
      const sumaOtrosCampos = camposAsignacion
        .filter((campo) => campo !== field)
        .reduce((total, campo) => total + toNumber(prev[campo]), 0);

      const maximoPermitido = Math.max(
        votantesHabilitados - sumaOtrosCampos,
        0
      );

      const valorFinal =
        numericValue > maximoPermitido ? maximoPermitido : numericValue;

      return {
        ...prev,
        [field]: String(valorFinal),
      };
    });
  }

  function getMaxForField(field) {
    const sumaOtrosCampos = camposAsignacion
      .filter((campo) => campo !== field)
      .reduce((total, campo) => total + toNumber(form[campo]), 0);

    return Math.max(votantesHabilitados - sumaOtrosCampos, 0);
  }

  function validateFrontend() {
    const errors = [];

    if (!currentUser?.username) {
      errors.push("Debe existir un usuario activo.");
    }

    if (!mesaSeleccionada) {
      errors.push("Primero debes seleccionar una mesa existente.");
    }

    if (mesaTieneTranscripcion) {
      errors.push("Esta mesa ya tiene transcripción oficial registrada.");
    }

    if (votantesHabilitados <= 0) {
      errors.push(
        "La mesa seleccionada no tiene votantes habilitados válidos."
      );
    }

    if (papeletasAnforaCalculada > votantesHabilitados) {
      errors.push(
        `La asignación total no puede superar los votantes habilitados. Votantes: ${votantesHabilitados}, asignados: ${papeletasAnforaCalculada}.`
      );
    }

    if (papeletasNoUtilizadasCalculada < 0) {
      errors.push("Las papeletas no utilizadas no pueden quedar en negativo.");
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    const errors = validateFrontend();

    if (errors.length > 0) {
      setMessage(errors.join(" | "));
      setMessageType("error");
      return;
    }

    setSaving(true);

    const payload = {
      codigo_acta: Number(mesaSeleccionada.codigo_acta),
      p1: toNumber(form.p1),
      p2: toNumber(form.p2),
      p3: toNumber(form.p3),
      p4: toNumber(form.p4),
      votos_blancos: toNumber(form.votos_blancos),
      votos_nulos: toNumber(form.votos_nulos),
      apertura_hora: toNumber(form.apertura_hora),
      apertura_minutos: toNumber(form.apertura_minutos),
      cierre_hora: toNumber(form.cierre_hora),
      cierre_minutos: toNumber(form.cierre_minutos),
      observaciones: form.observaciones.trim() || null,
      usuario_revision: currentUser?.username,
    };

    const response = await crearMesaYActaOficial(payload);

    setSaving(false);

    if (!response.ok) {
      setMessage(
        response.errors?.join(" | ") ||
          response.message ||
          "No se pudo registrar la transcripción."
      );
      setMessageType("error");
      return;
    }

    setMessage(
      `Transcripción registrada correctamente. Código de acta: ${response.data?.codigo_acta}`
    );
    setMessageType("success");

    setMesaSeleccionada(null);
    setForm(initialForm);
    setCodigoBusqueda("");
    await loadCatalogo();
  }

  if (loading) {
    return <div className="loading-box">Cargando mesas existentes...</div>;
  }

  return (
    <div className="cre-root">
      <div className="cre-header">
        <div>
          <h2 className="page-title">Registrar transcripción oficial</h2>

          <p className="page-description">
            Busca una mesa existente vacía y registra los datos de su
            transcripción oficial.
          </p>
        </div>

        <button className="cre-back-button" onClick={onBack}>
          Volver a actas oficiales
        </button>
      </div>

      {message && (
        <div
          className={
            messageType === "success"
              ? "cre-message cre-message-success"
              : "cre-message cre-message-error"
          }
        >
          {message}
        </div>
      )}

      <form className="cre-form" onSubmit={handleSubmit}>
        <section className="cre-section">
          <h3>Buscar por código de acta</h3>

          <div className="cre-grid">
            <div className="cre-field">
              <label>Código de acta</label>
              <input
                type="number"
                value={codigoBusqueda}
                onChange={(event) => setCodigoBusqueda(event.target.value)}
                placeholder="Ej: 1010200001005"
              />
            </div>

            <div className="cre-field">
              <label>Acción</label>
              <button
                type="button"
                className="cre-primary"
                onClick={buscarPorCodigoActa}
              >
                Buscar mesa
              </button>
            </div>
          </div>
        </section>

        <section className="cre-section">
          <h3>Buscar por ubicación</h3>

          <div className="cre-grid">
            <div className="cre-field">
              <label>Departamento</label>
              <select
                value={form.departamento}
                onChange={(event) =>
                  handleDepartamentoChange(event.target.value)
                }
              >
                <option value="">Seleccionar departamento</option>
                {departamentos.map((departamento) => (
                  <option key={departamento} value={departamento}>
                    {departamento}
                  </option>
                ))}
              </select>
            </div>

            <div className="cre-field">
              <label>Municipio</label>
              <select
                value={form.municipio}
                onChange={(event) => handleMunicipioChange(event.target.value)}
                disabled={!form.departamento}
              >
                <option value="">Seleccionar municipio</option>
                {municipios.map((municipio) => (
                  <option key={municipio} value={municipio}>
                    {municipio}
                  </option>
                ))}
              </select>
            </div>

            <div className="cre-field">
              <label>Provincia</label>
              <select
                value={form.provincia}
                onChange={(event) => handleProvinciaChange(event.target.value)}
                disabled={!form.municipio}
              >
                <option value="">Seleccionar provincia</option>
                {provincias.map((provincia) => (
                  <option key={provincia} value={provincia}>
                    {provincia}
                  </option>
                ))}
              </select>
            </div>

            <div className="cre-field">
              <label>Recinto electoral existente</label>
              <select
                value={form.codigo_recinto}
                onChange={(event) => handleRecintoChange(event.target.value)}
                disabled={!form.provincia}
              >
                <option value="">Seleccionar recinto electoral</option>
                {recintosFiltrados.map((recinto) => (
                  <option
                    key={recinto.codigo_recinto}
                    value={recinto.codigo_recinto}
                  >
                    {recinto.nombre_recinto}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {recintoSeleccionado && (
            <div className="cre-recinto-box">
              <p>
                <b>Recinto:</b> {recintoSeleccionado.nombre_recinto}
              </p>
              <p>
                <b>Dirección:</b>{" "}
                {recintoSeleccionado.direccion || "Sin dirección"}
              </p>
              <p>
                <b>Mesas registradas:</b> {mesasFiltradas.length}
              </p>
            </div>
          )}
        </section>

        {form.codigo_recinto && (
          <section className="cre-section">
            <h3>Mesas del recinto</h3>

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código acta</th>
                    <th>Mesa</th>
                    <th>Votantes habilitados</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {mesasFiltradas.map((mesa) => (
                    <tr key={mesa.codigo_acta}>
                      <td>{mesa.codigo_acta}</td>
                      <td>{mesa.nro_mesa}</td>
                      <td>{mesa.votantes_habilitados}</td>
                      <td>
                        {mesa.tiene_transcripcion
                          ? "Con transcripción"
                          : "Vacía"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={
                            mesa.tiene_transcripcion
                              ? "cre-secondary"
                              : "cre-primary"
                          }
                          disabled={mesa.tiene_transcripcion}
                          onClick={() => seleccionarMesa(mesa)}
                        >
                          {mesa.tiene_transcripcion
                            ? "Ya transcrita"
                            : "Seleccionar"}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {mesasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan="5">
                        No hay mesas registradas en este recinto.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="cre-section">
          <h3>Mesa seleccionada</h3>

          {!mesaSeleccionada && (
            <div className="cre-validation-box">
              <p>
                Selecciona una mesa vacía desde la lista o busca por código de
                acta.
              </p>
            </div>
          )}

          {mesaSeleccionada && (
            <div className="cre-grid">
              <div className="cre-field">
                <label>Código de acta</label>
                <input value={mesaSeleccionada.codigo_acta} readOnly />
              </div>

              <div className="cre-field">
                <label>Número de mesa</label>
                <input value={mesaSeleccionada.nro_mesa} readOnly />
              </div>

              <div className="cre-field">
                <label>Votantes habilitados</label>
                <input value={votantesHabilitados} readOnly />
              </div>

              <div className="cre-field">
                <label>Puntos disponibles</label>
                <input value={puntosDisponibles} readOnly />
              </div>
            </div>
          )}

          {mesaTieneTranscripcion && (
            <div className="cre-message cre-message-error">
              Esta mesa ya tiene transcripción oficial. No se puede insertar de
              nuevo.
            </div>
          )}

          {mesaSeleccionada && votantesHabilitados <= 0 && (
            <div className="cre-message cre-message-error">
              Esta mesa no tiene votantes habilitados válidos.
            </div>
          )}
        </section>

        <section className="cre-section">
          <h3>Datos de la transcripción</h3>

          {!puedeAsignarVotos && (
            <div className="cre-validation-box">
              <p>
                Primero selecciona una mesa vacía con votantes habilitados
                mayores a 0.
              </p>
            </div>
          )}

          <div className="cre-grid">
            <div className="cre-field">
              <label>P1</label>
              <input
                type="number"
                min="0"
                max={getMaxForField("p1")}
                disabled={!puedeAsignarVotos}
                value={form.p1}
                onChange={(event) =>
                  handleAsignacionChange("p1", event.target.value)
                }
              />
            </div>

            <div className="cre-field">
              <label>P2</label>
              <input
                type="number"
                min="0"
                max={getMaxForField("p2")}
                disabled={!puedeAsignarVotos}
                value={form.p2}
                onChange={(event) =>
                  handleAsignacionChange("p2", event.target.value)
                }
              />
            </div>

            <div className="cre-field">
              <label>P3</label>
              <input
                type="number"
                min="0"
                max={getMaxForField("p3")}
                disabled={!puedeAsignarVotos}
                value={form.p3}
                onChange={(event) =>
                  handleAsignacionChange("p3", event.target.value)
                }
              />
            </div>

            <div className="cre-field">
              <label>P4</label>
              <input
                type="number"
                min="0"
                max={getMaxForField("p4")}
                disabled={!puedeAsignarVotos}
                value={form.p4}
                onChange={(event) =>
                  handleAsignacionChange("p4", event.target.value)
                }
              />
            </div>

            <div className="cre-field">
              <label>Votos válidos calculados</label>
              <input type="text" value={votosValidosCalculados} readOnly />
            </div>

            <div className="cre-field">
              <label>Votos blancos</label>
              <input
                type="number"
                min="0"
                max={getMaxForField("votos_blancos")}
                disabled={!puedeAsignarVotos}
                value={form.votos_blancos}
                onChange={(event) =>
                  handleAsignacionChange("votos_blancos", event.target.value)
                }
              />
            </div>

            <div className="cre-field">
              <label>Votos nulos</label>
              <input
                type="number"
                min="0"
                max={getMaxForField("votos_nulos")}
                disabled={!puedeAsignarVotos}
                value={form.votos_nulos}
                onChange={(event) =>
                  handleAsignacionChange("votos_nulos", event.target.value)
                }
              />
            </div>

            <div className="cre-field">
              <label>Papeletas en ánfora calculadas</label>
              <input type="text" value={papeletasAnforaCalculada} readOnly />
            </div>

            <div className="cre-field">
              <label>Papeletas no utilizadas calculadas</label>
              <input
                type="text"
                value={
                  papeletasNoUtilizadasCalculada >= 0
                    ? papeletasNoUtilizadasCalculada
                    : 0
                }
                readOnly
              />
            </div>
          </div>

          <div className="cre-validation-box">
            <p>
              <b>Validación 1:</b> P1 + P2 + P3 + P4 ={" "}
              {votosValidosCalculados} votos válidos.
            </p>

            <p>
              <b>Validación 2:</b> válidos + blancos + nulos ={" "}
              {papeletasAnforaCalculada} papeletas en ánfora.
            </p>

            <p>
              <b>Validación 3:</b> votantes habilitados - papeletas en ánfora ={" "}
              {papeletasNoUtilizadasCalculada >= 0
                ? papeletasNoUtilizadasCalculada
                : 0}{" "}
              papeletas no utilizadas.
            </p>
          </div>
        </section>

        <section className="cre-section">
          <h3>Horario y observación</h3>

          <div className="cre-grid">
            <div className="cre-field">
              <label>Hora apertura</label>
              <input
                type="number"
                min="0"
                max="23"
                value={form.apertura_hora}
                onChange={(event) =>
                  updateField("apertura_hora", event.target.value)
                }
              />
            </div>

            <div className="cre-field">
              <label>Minutos apertura</label>
              <input
                type="number"
                min="0"
                max="59"
                value={form.apertura_minutos}
                onChange={(event) =>
                  updateField("apertura_minutos", event.target.value)
                }
              />
            </div>

            <div className="cre-field">
              <label>Hora cierre</label>
              <input
                type="number"
                min="0"
                max="23"
                value={form.cierre_hora}
                onChange={(event) =>
                  updateField("cierre_hora", event.target.value)
                }
              />
            </div>

            <div className="cre-field">
              <label>Minutos cierre</label>
              <input
                type="number"
                min="0"
                max="59"
                value={form.cierre_minutos}
                onChange={(event) =>
                  updateField("cierre_minutos", event.target.value)
                }
              />
            </div>
          </div>

          <div className="cre-field cre-field-full">
            <label>Observaciones opcionales</label>
            <textarea
              value={form.observaciones}
              onChange={(event) =>
                updateField("observaciones", event.target.value)
              }
              placeholder="Puedes dejarlo vacío..."
            />
          </div>
        </section>

        <div className="cre-actions">
          <button type="button" className="cre-secondary" onClick={onBack}>
            Cancelar
          </button>

          <button
            type="submit"
            className="cre-primary"
            disabled={saving || !puedeAsignarVotos}
          >
            {saving ? "Guardando..." : "Registrar transcripción"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CrearActaOficialPage;