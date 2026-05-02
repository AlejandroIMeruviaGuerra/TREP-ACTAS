import "./StatCard.css";

function StatCard({ title, value, detail }) {
  return (
    <article className="sta-card">
      <p className="sta-title">{title}</p>
      <h3 className="sta-value">{value}</h3>
      <span className="sta-detail">{detail}</span>
    </article>
  );
}

export default StatCard;