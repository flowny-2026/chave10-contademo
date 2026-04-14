import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import Bloqueado from './pages/Bloqueado';
import Layout from './components/Layout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOficinas from './pages/admin/Oficinas';
import AdminPagamentos from './pages/admin/Pagamentos';
import AppDashboard from './pages/app/Dashboard';
import AppClientes from './pages/app/Clientes';
import AppVeiculos from './pages/app/Veiculos';
import AppOS from './pages/app/OS';

function getUser() {
  try { return JSON.parse(localStorage.getItem('c10_user')); } catch { return null; }
}

function PrivateRoute({ children, adminOnly = false }) {
  const user = getUser();
  if (!user && adminOnly) return <Navigate to="/admin/login" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.perfil !== 'master_admin') return <Navigate to="/app/dashboard" replace />;
  return children;
}

function RootRedirect() {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.perfil === 'master_admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/bloqueado" element={<Bloqueado />} />

        <Route path="/admin" element={
          <PrivateRoute adminOnly>
            <Layout area="admin" />
          </PrivateRoute>
        }>
          <Route path="dashboard"  element={<AdminDashboard />} />
          <Route path="oficinas"   element={<AdminOficinas />} />
          <Route path="pagamentos" element={<AdminPagamentos />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route path="/app" element={
          <PrivateRoute>
            <Layout area="app" />
          </PrivateRoute>
        }>
          <Route path="dashboard" element={<AppDashboard />} />
          <Route path="clientes"  element={<AppClientes />} />
          <Route path="veiculos"  element={<AppVeiculos />} />
          <Route path="os"        element={<AppOS />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
