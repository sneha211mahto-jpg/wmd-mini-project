export default function StatCard({ label, value, accent, icon }) {
  return (
    <div className={`stat-card ${accent || ''}`}>
      <div className="stat-card-header">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
