import { useState } from "react";
import { loginUser } from "../../utils/auth";
import image from "../../assets/Logo_oep.png";
import "./LoginPage.css";

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    const result = loginUser({
      username,
      password,
    });

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    setErrorMessage("");
    onLogin(result.user);
  }

  return (
    <main className="logi-root">
      <section className="logi-card">
        <div className="logi-logo-box">
          <img src={image} alt="Logo del sistema" />
        </div>

        <h1>Conteo de Resultados</h1>

        <p>
          Inicia sesión para revisar actas observadas, aprobar registros y
          rechazar inconsistencias.
        </p>

        {errorMessage && <div className="logi-error">{errorMessage}</div>}

        <form className="logi-form" onSubmit={handleSubmit}>
          <div>
            <label>Usuario</label>
            <input
              type="text"
              placeholder="Ejemplo: alejandro"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div>
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button type="submit">Ingresar al sistema</button>
        </form>

        <small>
          Login básico para control de revisión. El usuario quedará registrado
          cuando apruebe o rechace un acta.
        </small>
      </section>
    </main>
  );
}

export default LoginPage;