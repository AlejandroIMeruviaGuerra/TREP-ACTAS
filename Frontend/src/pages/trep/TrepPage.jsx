import "./TrepPage.css";

function TrepPage() {
  return (
    <div className="tre-page">
      <h1>Registro TREP</h1>
      <p>Formulario básico para simular el registro rápido de actas.</p>

      <form className="tre-form">
        <div className="tre-field">
          <label>Código de mesa</label>
          <input type="text" placeholder="Ej: 10101001001" />
        </div>

        <div className="tre-field">
          <label>Fuente</label>
          <select>
            <option>PDF_OCR</option>
            <option>SMS</option>
            <option>MOVIL</option>
          </select>
        </div>

        <div className="tre-grid">
          <input type="number" placeholder="Partido 1" />
          <input type="number" placeholder="Partido 2" />
          <input type="number" placeholder="Partido 3" />
          <input type="number" placeholder="Partido 4" />
          <input type="number" placeholder="Blancos" />
          <input type="number" placeholder="Nulos" />
          <input type="number" placeholder="Papeletas ánfora" />
          <input type="number" placeholder="Papeletas no usadas" />
        </div>

        <button type="button" className="tre-button">
          Registrar acta TREP
        </button>
      </form>
    </div>
  );
}

export default TrepPage;