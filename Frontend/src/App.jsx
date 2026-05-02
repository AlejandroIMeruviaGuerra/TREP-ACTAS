import { useState } from "react";
import MainLayout from "./components/layout/MainLayout";

import DashboardPage from "./pages/dashboard/DashboardPage";
import OficialPage from "./pages/oficial/OficialPage";
import ObservadasPage from "./pages/observadas/ObservadasPage";
import LogsPage from "./pages/logs/LogsPage";
import LoginPage from "./pages/login/LoginPage";
import MobilePdfPage from "./pages/mobile/pdf/MobilePdfPage";
import MobileCameraPage from "./pages/mobile/camera/MobileCameraPage";

import { getCurrentUser, logoutUser } from "./utils/auth";

import "./styles/variables.css";
import "./styles/global.css";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  function handleLogout() {
    logoutUser();
    setCurrentUser(null);
    setCurrentPage("dashboard");
  }

  function renderPage() {
    if (currentPage === "dashboard") return <DashboardPage />;
    if (currentPage === "oficial") return <OficialPage />;
    if (currentPage === "observadas") return <ObservadasPage />;
    if (currentPage === "pdf") return <MobilePdfPage />;
    if (currentPage === "camera") return <MobileCameraPage />;
    if (currentPage === "logs") return <LogsPage />;

    return <DashboardPage />;
  }

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