import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

const adminNav = [
  { to: '/admin/dashboard',  label: 'Dashboard',  icon: '▦' },
  { to: '/admin/oficinas',   label: 'Oficinas',   icon: '🏪' },
  { to: '/admin/pagamentos', label: 'Pagamentos', icon: '💳' },
];

const appNav = [
  { to: '/app/dashboard', label: 'Dashboard',        icon: '▦' },
  { to: '/app/clientes',  label: 'Clientes',          icon: '👥' },
  { to: '/app/veiculos',  label: 'Veículos',          icon: '🚗' },
  { to: '/app/os',        label: 'Ordens de Serviço', icon: '🔧' },
];

function getUser() {
  try { return JSON.parse(localStorage.getItem('c10_user')); } catch { return null; }
}

export default function Layout({ area }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = getUser();
  const nav = area === 'admin' ? adminNav : appNav;

  function logout() {
    localStorage.removeItem('c10_token');
    localStorage.removeItem('c10_user');
    navigate('/login');
  }

  return (
    <div className="app-shell">
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo-white.png" alt="Chave 10" style={{ height: 36, objectFit: 'contain' }} />
        </div>

        <div className="sidebar-section-label">{area === 'admin' ? 'Administração' : 'Oficina'}</div>
        <nav className="sidebar-nav">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.nome?.[0]?.toUpperCase() || 'U'}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.nome || 'Usuário'}</span>
              <span className="sidebar-user-role">{user?.perfil === 'master_admin' ? 'Administrador' : 'Oficina'}</span>
            </div>
            <button className="btn-logout-icon" onClick={logout} title="Sair">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setOpen(o => !o)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="topbar-logo">
            <img src="/logo.png" alt="Chave 10" style={{ height: 28, objectFit: 'contain' }} />
          </div>
          <div className="topbar-right">
            <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{user?.nome}</span>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
