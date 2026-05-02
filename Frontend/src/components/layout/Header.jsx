import "./Header.css";

function Header({ currentUser, onLogout }) {
  return (
    <header className="hea-root">
      <div>
        <h1 className="hea-title">Conteo de Resultados</h1>
        <p className="hea-subtitle">
          Panel oficial para revisión, conteo y control de actas electorales.
        </p>
      </div>

      <div className="hea-user-box">
        <div className="hea-user-info">
          <span>Usuario activo</span>
          <strong>{currentUser?.username || "Sin usuario"}</strong>
        </div>

        <button className="hea-logout" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

export default Header;