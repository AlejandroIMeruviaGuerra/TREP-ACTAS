import "./Sidebar.css";
import image from "../../assets/Logo_oep.png";

const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
  },
  {
    id: "oficial",
    label: "Actas oficiales",
  },
  {
    id: "observadas",
    label: "Actas observadas",
  },
  {
    id: "pdf",
    label: "Escanear PDF",
  },
  {
    id: "camera",
    label: "Tomar foto",
  },
  {
    id: "logs",
    label: "Logs",
  },
];

function Sidebar({ currentPage, onChangePage }) {
  return (
    <aside className="sid-root">
      <div className="sid-brand">
        <img src={image} alt="Logo del sistema" />
      </div>

      <nav className="sid-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={
              currentPage === item.id
                ? "sid-nav-button sid-nav-button-active"
                : "sid-nav-button"
            }
            onClick={() => onChangePage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;