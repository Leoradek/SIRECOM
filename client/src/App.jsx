import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, homePathFor } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import StudentLayout from './components/StudentLayout.jsx';
import StaffLayout from './components/StaffLayout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import StudentHome from './pages/StudentHome.jsx';
import MyReservations from './pages/MyReservations.jsx';
import ReservationHistory from './pages/ReservationHistory.jsx';
import UserProfile from './pages/UserProfile.jsx';
import KitchenDashboard from './pages/KitchenDashboard.jsx';
import WeeklyMenuEditor from './pages/WeeklyMenuEditor.jsx';
import ActiveReservations from './pages/ActiveReservations.jsx';
import ReportsView from './pages/ReportsView.jsx';
import ShiftConfigPanel from './pages/ShiftConfigPanel.jsx';

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to={homePathFor(user.rol)} replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/registro" element={<GuestOnly><Register /></GuestOnly>} />

      {/* Portal del estudiante */}
      <Route element={<ProtectedRoute roles={['estudiante']} />}>
        <Route element={<StudentLayout />}>
          <Route path="/" element={<StudentHome />} />
          <Route path="/reservas" element={<MyReservations />} />
          <Route path="/historial" element={<ReservationHistory />} />
          <Route path="/perfil" element={<UserProfile />} />
        </Route>
      </Route>

      {/* Panel de Cocina Central / Admin */}
      <Route element={<ProtectedRoute roles={['cocina_central', 'admin']} />}>
        <Route element={<StaffLayout />}>
          <Route path="/cocina" element={<KitchenDashboard />} />
          <Route path="/cocina/menu" element={<WeeklyMenuEditor />} />
          <Route path="/cocina/reservas" element={<ActiveReservations />} />
          <Route path="/cocina/reportes" element={<ReportsView />} />
        </Route>
      </Route>

      {/* Solo administrador */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<StaffLayout />}>
          <Route path="/cocina/configuracion" element={<ShiftConfigPanel />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
