import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homePathFor } from '../context/AuthContext.jsx';
import { Spinner } from './ui.jsx';

/** Protege rutas: exige sesión y, opcionalmente, uno de los roles indicados (RBAC en el cliente) */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen bg-background"><Spinner label="Verificando sesión..." /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.rol)) return <Navigate to={homePathFor(user.rol)} replace />;
  return <Outlet />;
}
