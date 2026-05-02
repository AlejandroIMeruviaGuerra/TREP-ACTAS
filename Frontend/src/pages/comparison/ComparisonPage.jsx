import ResultsTable from "../../components/dashboard/ResultsTable.jsx";
import { departmentResults } from "../../data/dashboardData.js";
import "./ComparisonPage.css";

function ComparisonPage() {
  const rows = departmentResults.map((item) => ({
    department: item.department,
    trep: item.trep.toLocaleString("es-BO"),
    oficial: item.oficial.toLocaleString("es-BO"),
    difference: (item.oficial - item.trep).toLocaleString("es-BO"),
  }));

  const columns = [
    { key: "department", label: "Departamento" },
    { key: "trep", label: "TREP" },
    { key: "oficial", label: "Oficial" },
    { key: "difference", label: "Diferencia" },
  ];

  return (
    <div className="com-page">
      <h1>Comparación TREP vs Oficial</h1>
      <p>Diferencias simuladas entre recuento rápido y cómputo oficial.</p>

      <ResultsTable columns={columns} rows={rows} />
    </div>
  );
}

export default ComparisonPage;