/** Barra de cupos: azul institucional (normal) o roja (crítica, < 10 % de cupos disponibles) */
export default function ProgressBar({ disponibles, total, label }) {
  const pct = total > 0 ? (disponibles / total) * 100 : 0;
  const critico = pct < 10;
  const ocupado = total > 0 ? 100 - pct : 100; // el relleno representa la ocupación
  return (
    <div
      role="progressbar"
      aria-label={label || 'Cupos disponibles'}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={disponibles}
      aria-valuetext={`${disponibles} de ${total} cupos disponibles${critico ? ', disponibilidad crítica' : ''}`}
      className="h-2 w-full overflow-hidden rounded-full bg-primary/10"
    >
      <div className={`h-full rounded-full transition-all duration-500 ${critico ? 'bg-error' : 'bg-primary'}`} style={{ width: `${Math.max(2, Math.min(100, ocupado))}%` }} />
    </div>
  );
}
