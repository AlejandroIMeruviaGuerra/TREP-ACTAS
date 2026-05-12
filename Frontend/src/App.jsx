import { useState } from "react";
import MainLayout from "./components/layout/MainLayout";

import DashboardPage from "./pages/dashboard/DashboardPage";
import DashboardConteoRapidoPage from "./pages/dashboard/DashboardConteoRapidoPage";
import OficialPage from "./pages/oficial/OficialPage";
import CrearActaOficialPage from "./pages/oficial/CrearActaOficialPage";
import ObservadasPage from "./pages/observadas/ObservadasPage";
import LogsPage from "./pages/logs/LogsPage";
import LoginPage from "./pages/login/LoginPage";
import MobilePdfPage from "./pages/mobile/pdf/MobilePdfPage";
import MobileCameraPage from "./pages/mobile/camera/MobileCameraPage";

import { getCurrentUser, logoutUser } from "./utils/auth";

import "./styles/variables.css";
import "./styles/global.css";

const PAGE_COMPONENTS = {
  "dashboard-oficial": DashboardPage,
  "dashboard-conteo": DashboardConteoRapidoPage,
  oficial: OficialPage,
  "crear-oficial": CrearActaOficialPage,
  observadas: ObservadasPage,
  logs: LogsPage,
  pdf: MobilePdfPage,
  camera: MobileCameraPage,
};

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard-oficial");
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setCurrentPage("dashboard-oficial");
  };

  const renderPage = () => {
    const PageComponent = PAGE_COMPONENTS[currentPage];
    
    if (currentPage === "oficial") {
      return <PageComponent onCreate={() => setCurrentPage("crear-oficial")} />;
    }
    
    if (currentPage === "crear-oficial") {
      return <PageComponent onBack={() => setCurrentPage("oficial")} />;
    }
    
    if (!PageComponent) {
      return <DashboardPage />;
    }
    
    return <PageComponent />;
  };

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} />;
  }

  return (
    <MainLayout
      currentPage={currentPage}
      onChangePage={setCurrentPage}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {renderPage()}
    </MainLayout>
  );
}

export default App;