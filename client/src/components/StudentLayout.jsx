import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, Logo } from './ui.jsx';

const LINKS = [
  { to: '/', label: 'Inicio', end: true, icon: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z' },
  { to: '/reservas', label: 'Reservas', icon: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z' },
  { to: '/historial', label: 'Historial', icon: 'M12 8v4l3 2M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5' },
  { to: '/perfil', label: 'Perfil', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0' },
];

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Portal del estudiante: Navbar superior (desktop) + Bottom Tab Bar (mobile 375px) */
export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const salir = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 bg-primary text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16 md:px-6">
          <Logo light />
          <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación principal">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-accent' : 'text-white/85 hover:text-white'}`}>
                {l.label === 'Perfil' ? 'Mi Perfil' : l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold leading-tight">{user?.nombre}</p>
              <p className="text-xs leading-tight text-white/70">{user?.carrera ? `Estudiante (${user.carrera})` : 'Estudiante'}</p>
            </div>
            <Avatar user={user} />
            <button type="button" onClick={salir} className="rounded-md px-2 py-1 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white">Salir</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-primary/10 bg-surface md:hidden" aria-label="Navegación inferior">
        <ul className="grid grid-cols-4">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-primary' : 'text-muted'}`}>
                {({ isActive }) => (
                  <>
                    <span className={`rounded-full px-4 py-1 ${isActive ? 'bg-accent/25' : ''}`}><Icon d={l.icon} /></span>
                    {l.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
