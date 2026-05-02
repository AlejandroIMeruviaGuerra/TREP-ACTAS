import Header from "./Header";
import Sidebar from "./Sidebar";
import "./MainLayout.css";

function MainLayout({
  children,
  currentPage,
  onChangePage,
  currentUser,
  onLogout,
}) {
  return (
    <div className="lay-root">
      <Sidebar currentPage={currentPage} onChangePage={onChangePage} />

      <main className="lay-main">
        <Header currentUser={currentUser} onLogout={onLogout} />
        <section className="lay-content">{children}</section>
      </main>
    </div>
  );
}

export default MainLayout;