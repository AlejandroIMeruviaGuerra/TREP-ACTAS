import { useEffect, useMemo, useState } from "react";
import {
  crearMesaYActaOficial,
  getActasOficialesDetalle, // ← CAMBIADO: usar getActasOficialesDetalle en lugar de getCatalogoOficial
} from "../../services/oficialService";
import { getCurrentUser } from "../../utils/auth";
import "./CrearActaOficialPage.css";

const initialForm = {
  departamento: "",
  provincia: "",
  municipio: "",
  codigo_recinto: "",
  votantes_habilitados: "",
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
    a.localeCompare(b)
  );
}

function CrearActaOficialPage({ onBack }) {
  const [form, setForm] = useState(initialForm);
  const [recintos, setRecintos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const currentUser = getCurrentUser();

  // FUNCIÓN MODIFICADA: Obtener recintos desde las actas existentes
  async function loadCatalogo() {
    setLoading(true);

    // Usar getActasOficialesDetalle en lugar de getCatalogoOficial
    const response = await getActasOficialesDetalle();

    if (!response.ok) {
      setMessage(response.message || "No se pudo cargar los recintos.");
      setMessageType("error");
      setLoading(false);
      return;
    }

    const actas = response.data || [];
    
    // Extraer recintos únicos de las actas
    const recintosMap = new Map();
    
    actas.forEach(acta => {
      if (acta.codigo_recinto && !recintosMap.has(String(acta.codigo_recinto))) {
        // Contar cuántas mesas tiene este recinto
        const mesasDelRecinto = actas.filter(a => String(a.codigo_recinto) === String(acta.codigo_recinto));
        
        recintosMap.set(String(acta.codigo_recinto), {
          codigo_recinto: acta.codigo_recinto,
          nombre_recinto: acta.nombre_recinto || `Recinto ${acta.codigo_recinto}`,
          direccion: acta.direccion_recinto || "Sin dirección",
          departamento: acta.departamento || "",
          provincia: acta.provincia || "",
          municipio: acta.municipio || "",
          num_mesas: mesasDelRecinto.length
        });
      }
    });
    
    const recintosList = Array.from(recintosMap.values());
    
    if (recintosList.length === 0) {
      setMessage("No hay recintos registrados. Debes crear al menos un recinto primero.");
      setMessageType("error");
    }
    
    setRecintos(recintosList);
    setLoading(false);
  }

  useEffect(() => {
    loadCatalogo();
  }, []);

  const departamentos = useMemo(() => {
    return uniqueValues(recintos.map((item) => item.departamento));
  }, [recintos]);

  const provincias = useMemo(() => {
    return uniqueValues(
      recintos
        .filter((item) => item.departamento === form.departamento)
        .map((item) => item.provincia)
    );
  }, [recintos, form.departamento]);

  const municipios = useMemo(() => {
    return uniqueValues(
      recintos
        .filter(
          (item) =>
            item.departamento === form.departamento &&
            item.provincia === form.provincia
        )
        .map((item) => item.municipio)
    );
  }, [recintos, form.departamento, form.provincia]);

  const recintosFiltrados = useMemo(() => {
    return recintos.filter(
      (item) =>
        item.departamento === form.departamento &&
        item.provincia === form.provincia &&
        item.municipio === form.municipio
    );
  }, [recintos, form.departamento, form.provincia, form.municipio]);

  const recintoSeleccionado = useMemo(() => {
    return recintos.find(
      (item) => String(item.codigo_recinto) === String(form.codigo_recinto)
    );
  }, [recintos, form.codigo_recinto]);

  const votantesHabilitados = toNumber(form.votantes_habilitados);
  const puedeAsignarVotos = votantesHabilitados > 0;

  const mesaAutomatica = recintoSeleccionado
    ? Number(recintoSeleccionado.num_mesas || 0) + 1
    : "";

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

  const codigoActaCalculado =
    form.codigo_recinto && mesaAutomatica
      ? toNumber(form.codigo_recinto) * 1000 + toNumber(mesaAutomatica)
      : "";

  const puntosDisponibles =
    votantesHabilitados - papeletasAnforaCalculada >= 0
      ? votantesHabilitados - papeletasAnforaCalculada
      : 0;

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
      provincia: "",
      municipio: "",
      codigo_recinto: "",
    }));
  }

  function handleProvinciaChange(value) {
    setForm((prev) => ({
      ...prev,
      provincia: value,
      municipio: "",
      codigo_recinto: "",
    }));
  }

  function handleMunicipioChange(value) {
    setForm((prev) => ({
      ...prev,
      municipio: value,
      codigo_recinto: "",
    }));
  }

  function handleRecintoChange(value) {
    setForm((prev) => ({
      ...prev,
      codigo_recinto: value,
    }));
  }

  function handleVotantesChange(value) {
    const nuevoValor = Number(value || 0);

    setForm((prev) => {
      const nuevaForma = {
        ...prev,
        votantes_habilitados: value,
      };

      const totalAsignado =
        toNumber(prev.p1) +
        toNumber(prev.p2) +
        toNumber(prev.p3) +
        toNumber(prev.p4) +
        toNumber(prev.votos_blancos) +
        toNumber(prev.votos_nulos);

      if (!nuevoValor || nuevoValor <= 0 || totalAsignado > nuevoValor) {
        nuevaForma.p1 = "";
        nuevaForma.p2 = "";
        nuevaForma.p3 = "";
        nuevaForma.p4 = "";
        nuevaForma.votos_blancos = "";
        nuevaForma.votos_nulos = "";
      }

      return nuevaForma;
    });
  }

  function handleAsignacionChange(field, value) {
    if (!puedeAsignarVotos) {
      return;
    }

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

    if (!form.departamento) {
      errors.push("Selecciona un departamento.");
    }

    if (!form.provincia) {
      errors.push("Selecciona una provincia.");
    }

    if (!form.municipio) {
      errors.push("Selecciona un municipio.");
    }

    if (!form.codigo_recinto) {
      errors.push("Selecciona un recinto existente.");
    }

    if (!mesaAutomatica || mesaAutomatica <= 0) {
      errors.push("No se pudo calcular el número automático de mesa.");
    }

    if (!form.votantes_habilitados || votantesHabilitados <= 0) {
      errors.push("Primero debes ingresar votantes habilitados mayores a 0.");
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
      codigo_recinto: toNumber(form.codigo_recinto),
      votantes_habilitados: votantesHabilitados,
      p1: toNumber(form.p1),
      p2: toNumber(form.p2),
      p3: toNumber(form.p3),
      p4: toNumber(form.p4),
      votos_validos: votosValidosCalculados,
      votos_blancos: toNumber(form.votos_blancos),
      votos_nulos: toNumber(form.votos_nulos),
      papeletas_anfora: papeletasAnforaCalculada,
      papeletas_no_utilizadas: papeletasNoUtilizadasCalculada,
      apertura_hora: toNumber(form.apertura_hora),
      apertura_minutos: toNumber(form.apertura_minutos),
      cierre_hora: toNumber(form.cierre_hora),
      cierre_minutos: toNumber(form.cierre_minutos),
      observaciones: form.observaciones.trim() || null,
      usuario_revision: currentUser?.username,
    };

    try {
      const response = await crearMesaYActaOficial(payload);

      if (!response.ok) {
        setMessage(
          response.errors?.join(" | ") ||
            response.message ||
            "No se pudo crear el acta."
        );
        setMessageType("error");
        setSaving(false);
        return;
      }

      setMessage(
        `Acta creada correctamente. Mesa generada: ${response.data?.nro_mesa}. Código de acta: ${response.data?.codigo_acta}`
      );
      setMessageType("success");

      setForm(initialForm);
      await loadCatalogo(); // Recargar catálogo para actualizar el número de mesas
    } catch (error) {
      console.error("Error al crear acta:", error);
      setMessage(error.message || "Error al crear el acta");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="loading-box">Cargando recintos existentes...</div>;
  }

  return (
    <div className="cre-root">
      <div className="cre-header">
        <div>
          <h2 className="page-title">Crear mesa y acta oficial</h2>

          <p className="page-description">
            Crea una nueva mesa automática dentro de un recinto existente y
            registra su acta oficial.
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
        {/* Resto del JSX igual... */}
        <section className="cre-section">
          <h3>Ubicación del acta</h3>

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
              <label>Provincia</label>
              <select
                value={form.provincia}
                onChange={(event) => handleProvinciaChange(event.target.value)}
                disabled={!form.departamento}
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
              <label>Municipio</label>
              <select
                value={form.municipio}
                onChange={(event) => handleMunicipioChange(event.target.value)}
                disabled={!form.provincia}
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
              <label>Recinto / colegio existente</label>
              <select
                value={form.codigo_recinto}
                onChange={(event) => handleRecintoChange(event.target.value)}
                disabled={!form.municipio}
              >
                <option value="">Seleccionar recinto</option>
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
                <b>Mesas actuales:</b> {recintoSeleccionado.num_mesas ?? 0}
              </p>
              <p>
                <b>Nueva mesa automática:</b> {mesaAutomatica}
              </p>
            </div>
          )}
        </section>

        {/* El resto del formulario se mantiene igual */}
        <section className="cre-section">
          <h3>Datos de mesa</h3>

          <div className="cre-grid">
            <div className="cre-field">
              <label>Número de mesa automático</label>
              <input
                type="text"
                value={mesaAutomatica || "Seleccione un recinto"}
                readOnly
              />
            </div>

            <div className="cre-field">
              <label>Código de acta generado</label>
              <input
                type="text"
                value={codigoActaCalculado || "Seleccione un recinto"}
                readOnly
              />
            </div>

            <div className="cre-field">
              <label>Votantes habilitados</label>
              <input
                type="number"
                min="1"
                value={form.votantes_habilitados}
                onChange={(event) => handleVotantesChange(event.target.value)}
              />
            </div>

            <div className="cre-field">
              <label>Puntos disponibles</label>
              <input type="text" value={puntosDisponibles} readOnly />
            </div>
          </div>
        </section>

        <section className="cre-section">
          <h3>Datos del acta</h3>

          {!puedeAsignarVotos && (
            <div className="cre-validation-box">
              <p>
                Primero ingresa <b>votantes habilitados</b> mayores a 0 para
                poder asignar votos.
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

          <button type="submit" className="cre-primary" disabled={saving}>
            {saving ? "Guardando..." : "Crear mesa y acta oficial"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CrearActaOficialPage;