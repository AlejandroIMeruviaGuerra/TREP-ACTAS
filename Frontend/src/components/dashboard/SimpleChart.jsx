import "./SimpleChart.css";

function SimpleChart({ data }) {
  const maxVotes = Math.max(...data.map((item) => item.votes));

  return (
    <div className="cha-card">
      <h3>Resultados por partido</h3>

      <div className="cha-list">
        {data.map((item) => {
          const width = `${(item.votes / maxVotes) * 100}%`;

          return (
            <div className="cha-row" key={item.party}>
              <div className="cha-label">
                <span>{item.party}</span>
                <strong>{item.votes.toLocaleString("es-BO")}</strong>
              </div>

              <div className="cha-bar-bg">
                <div className="cha-bar-fill" style={{ width }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SimpleChart;