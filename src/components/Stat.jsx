import Icon from './Icon.jsx';

export default function Stat({ label, value, note, icon, color }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon name={icon} size={18} />
      </div>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-note">{note}</div>
    </article>
  );
}
