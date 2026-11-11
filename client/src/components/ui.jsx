import { iniciales } from '../utils/format.js';

export function Spinner({ label = 'Cargando...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-muted" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Alert({ type = 'error', children, onRetry }) {
  const styles = {
    error: 'border-error/30 bg-error/5 text-error',
    info: 'border-primary/20 bg-primary/5 text-primary',
    success: 'border-success/30 bg-success/5 text-primary',
  };
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${styles[type]}`} role={type === 'error' ? 'alert' : 'status'}>
      <span>{children}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary px-3 py-1.5 text-xs">
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Badge({ className = '', children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}

export function Avatar({ user, size = 36 }) {
  if (user?.fotoUrl) {
    return <img src={user.fotoUrl} alt={`Foto de ${user.nombre}`} style={{ width: size, height: size }} className="rounded-full object-cover" />;
  }
  return (
    <span style={{ width: size, height: size }} className="inline-flex items-center justify-center rounded-full bg-accent text-sm font-bold text-primary" aria-hidden="true">
      {iniciales(user?.nombre)}
    </span>
  );
}

export function Logo({ light = false }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-7 w-7 rounded-md bg-accent" aria-hidden="true" />
      <span className={`text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-primary'}`}>SIRECOM</span>
    </span>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="card px-6 py-12 text-center">
      <p className="font-semibold text-primary">{title}</p>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Volver', danger, busy, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-primary/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="card w-full max-w-sm p-6">
        <h2 id="confirm-title" className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" className={danger ? 'btn-danger' : 'btn-accent'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
