import { useState } from "react";
import { loginUser } from "../../utils/auth";
import image from "../../assets/Logo_oep.png";
import "./LoginPage.css";

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Estado para animar el error si se repite
  const [errorAnimation, setErrorAnimation] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();

    const result = loginUser({ username, password });

    if (!result.ok) {
      setErrorMessage(result.message);
      // Disparar animación de vibración
      setErrorAnimation(true);
      setTimeout(() => setErrorAnimation(false), 500); 
      return;
    }

    setErrorMessage("");
    onLogin(result.user);
  }

  return (
    <main className="expert-root">
      {/* SECCIÓN IZQUIERDA: Identidad e Impacto */}
      <section className="expert-visual-pane">
        {/* Patrón geométrico de fondo (generado por CSS) */}
        <div className="expert-geo-pattern"></div>
        
        <div className="expert-visual-content">
          <div className="expert-logo-wrapper">
            <img src={image} alt="Logo OEP" />
          </div>
          <h1>
            Sistema Transparente <br />
            de Conteo de Resultados
          </h1>
          <p>
            Plataforma oficial para la revisión y validación de actas electorales. 
            Tu labor garantiza la integridad democrática.
          </p>
        </div>
        <div className="expert-visual-footer">
          <small>© Órgano Electoral Plurinacional. Todos los derechos reservados.</small>
        </div>
      </section>

      {/* SECCIÓN DERECHA: Formulario enfocado */}
      <section className="expert-form-pane">
        <div className="expert-form-container">
          <h2>Iniciar Sesión</h2>
          <p className="expert-subtitle">Introduce tus credenciales para acceder al módulo de revisión.</p>

          <form className="expert-form" onSubmit={handleSubmit}>
            <div className={`expert-input-group ${errorMessage ? "expert-input-error" : ""}`}>
              <label htmlFor="username">Usuario</label>
              <div className="expert-input-wrapper">
                {/* Ícono de usuario SVG */}
                <svg className="expert-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input
                  id="username"
                  type="text"
                  placeholder="alejandro.vargas"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className={`expert-input-group ${errorMessage ? "expert-input-error" : ""}`}>
              <label htmlFor="password">Contraseña</label>
              <div className="expert-input-wrapper">
                {/* Ícono de candado SVG */}
                <svg className="expert-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="expert-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className={`expert-error-message ${errorAnimation ? "expert-shake" : ""}`}>
                {errorMessage}
              </div>
            )}

            <button type="submit" className="expert-submit-btn">
              <span>Ingresar Seguramente</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          </form>

          <div className="expert-form-footer">
            <p>Módulo de Control de Revisión - Nivel de acceso: Restringido</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;