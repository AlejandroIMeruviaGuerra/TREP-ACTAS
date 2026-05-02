import "./SmsPage.css";

function SmsPage() {
  return (
    <div className="sms-page">
      <h1>Simulación SMS</h1>
      <p>Formulario para probar mensajes SMS antes de conectar el backend.</p>

      <div className="sms-card">
        <label>Número de celular</label>
        <input type="text" placeholder="Ej: 77304085" />

        <label>Mensaje SMS</label>
        <textarea
          rows="5"
          placeholder="MESA:10101001001;A:300;S:39;P1:120;P2:80;P3:50;P4:30;B:10;N:10"
        ></textarea>

        <button type="button">Procesar SMS</button>
      </div>
    </div>
  );
}

export default SmsPage;