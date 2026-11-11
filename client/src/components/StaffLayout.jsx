import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar, Logo } from './ui.jsx';

const LINKS = [
  { to: '/cocina', label: 'Dashboard', end: true },
  { to: '/cocina/menu', label: 'Menú Semanal' },
  { to: '/cocina/reservas', label: 'Reservas Activas' },
  { to: '/cocina/reportes', label: 'Reportes' },
  { to: '/cocina/configuracion', label: 'Configuración', roles: ['admin'] },
];

function SidebarContent({ user, onNavigate, onLogout }) {
  return (
    <div className="flex h-full flex-col bg-primary text-white">
      <div className="px-5 py-6">
        <Logo light />
        <p className="mt-1 pl-9 text-xs font-medium text-accent">Panel de Personal</p>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Navegación del panel">
        {LINKS.filter((l) => !l.roles || l.roles.includes(user.rol)).map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            onClick={onNavigate}
            className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-white/10 text-accent' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar user={user} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.nombre}</p>
            <p className="text-xs text-white/70">{user.rol === 'admin' ? 'Administrador' : 'Cocina Central'}</p>
          </div>
        </div>
        <button type="button" onClick={onLogout} className="mt-3 w-full rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10">
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/** Panel de Cocina Central / Admin: Sidebar lateral (desktop) + menú adaptable tipo drawer (mobile) */
export default function StaffLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const salir = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 md:block">
        <SidebarContent user={user} onLogout={salir} />
      </aside>

      <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-primary px-4 text-white md:hidden">
        <button type="button" onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-white/10" aria-label="Abrir menú" aria-expanded={open}>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="text-sm font-bold">Panel Cocina</span>
        <Avatar user={user} size={32} />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <button type="button" className="absolute inset-0 bg-primary/60" onClick={() => setOpen(false)} aria-label="Cerrar menú" />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] shadow-card">
            <SidebarContent user={user} onNavigate={() => setOpen(false)} onLogout={salir} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
