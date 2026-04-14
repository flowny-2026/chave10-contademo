import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

// SVG Icons
const IC = {
  dashboard:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  clientes:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  veiculos:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  os:           <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  orcamentos:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  agenda:       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  mensagens:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  financeiro:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  relatorios:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  lembretes:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  estoque:      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  configuracoes:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  oficinas:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  pagamentos:   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
};

const adminNav = [
  { to: '/admin/dashboard',  label: 'Dashboard',  icon: IC.dashboard },
  { to: '/admin/oficinas',   label: 'Oficinas',   icon: IC.oficinas },
  { to: '/admin/pagamentos', label: 'Pagamentos', icon: IC.pagamentos },
];

const appNavPrincipal = [
  { to: '/app/dashboard',    label: 'Dashboard',         icon: IC.dashboard },
  { to: '/app/clientes',     label: 'Clientes',          icon: IC.clientes },
  { to: '/app/veiculos',     label: 'Veículos',          icon: IC.veiculos },
  { to: '/app/os',           label: 'Ordens de Serviço', icon: IC.os },
  { to: '/app/orcamentos',   label: 'Orçamentos',        icon: IC.orcamentos },
  { to: '/app/agenda',       label: 'Agenda',            icon: IC.agenda, badge: 'Novo' },
  { to: '/app/mensagens',    label: 'Mensagens',         icon: IC.mensagens },
];

const appNavGestao = [
  { to: '/app/financeiro',    label: 'Financeiro',    icon: IC.financeiro },
  { to: '/app/relatorios',    label: 'Relatórios',    icon: IC.relatorios },
  { to: '/app/lembretes',     label: 'Lembretes',     icon: IC.lembretes },
  { to: '/app/estoque',       label: 'Estoque',       icon: IC.estoque },
  { to: '/app/configuracoes', label: 'Configurações', icon: IC.configuracoes },
];

function getUser() {
  try { return JSON.parse(localStorage.getItem('c10_user')); } catch { return null; }
}

function UserDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="topbar-user" onClick={() => setOpen(o => !o)}>
        <div className="topbar-avatar">{user?.nome?.[0]?.toUpperCase() || 'U'}</div>
        <div className="topbar-user-info">
          <span className="topbar-user-name">{user?.nome || 'Usuário'}</span>
          <span className="topbar-user-role">{user?.perfil === 'master_admin' ? 'Administrador' : 'Gerente'}</span>
        </div>
        <svg style={{ marginLeft: 4, color: 'var(--gray-400)', flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div className="user-dropdown" style={{ display: 'block' }}>
          <div className="udrop-header">
            <div className="udrop-avatar">{user?.nome?.[0]?.toUpperCase() || 'U'}</div>
            <div>
              <div className="udrop-name">{user?.nome}</div>
              <div className="udrop-role">{user?.perfil === 'master_admin' ? 'Administrador' : 'Gerente · oficina'}</div>
            </div>
          </div>
          <div className="udrop-divider" />
          <button className="udrop-item" onClick={() => { setOpen(false); navigate('/app/dashboard'); }}>
            {IC.dashboard} Dashboard
          </button>
          <button className="udrop-item" onClick={() => { setOpen(false); navigate('/app/configuracoes'); }}>
            {IC.configuracoes} Configurações
          </button>
          <div className="udrop-divider" />
          <button className="udrop-item udrop-item-danger" onClick={() => { setOpen(false); onLogout(); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout({ area }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = getUser();

  function logout() {
    localStorage.removeItem('c10_token');
    localStorage.removeItem('c10_user');
    navigate(area === 'admin' ? '/admin/login' : '/login');
  }

  const NavItem = ({ item }) => (
    <NavLink to={item.to}
      className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
      onClick={() => setOpen(false)}>
      <span className="nav-icon">{item.icon}</span>
      <span>{item.label}</span>
      {item.badge && <span className={`nav-badge ${item.badgeClass || ''}`}>{item.badge}</span>}
    </NavLink>
  );

  return (
    <div className="app-shell">
      {open && <div className="sidebar-overlay open" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-text">
            <span className="brand-name">Chave <span className="brand-accent">10</span></span>
            <span className="brand-slogan">A ferramenta que faltava na sua oficina</span>
          </div>
        </div>

        {area === 'admin' ? (
          <>
            <div className="sidebar-section-label">Administração</div>
            <nav className="sidebar-nav">
              {adminNav.map(item => <NavItem key={item.to} item={item} />)}
            </nav>
          </>
        ) : (
          <>
            <div className="sidebar-section-label">Principal</div>
            <nav className="sidebar-nav">
              {appNavPrincipal.map(item => <NavItem key={item.to} item={item} />)}
            </nav>
            <div className="sidebar-section-label">Gestão</div>
            <nav className="sidebar-nav">
              {appNavGestao.map(item => <NavItem key={item.to} item={item} />)}
            </nav>
          </>
        )}

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
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="topbar-logo">
            <span className="topbar-name">Chave <span className="accent">10</span></span>
          </div>

          {area === 'app' && (
            <div className="topbar-search">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder="Buscar cliente, OS, veículo..." />
            </div>
          )}

          <div className="topbar-right">
            {area === 'app' && (
              <>
                <div className="topbar-quick-actions">
                  <button className="btn btn-primary btn-sm topbar-action-btn" onClick={() => navigate('/app/os')} title="Nova OS">
                    {IC.os}
                    <span className="action-label">Nova OS</span>
                  </button>
                  <button className="btn btn-outline btn-sm topbar-action-btn" onClick={() => navigate('/app/clientes')} title="Novo Cliente">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                    <span className="action-label">Cliente</span>
                  </button>
                  <button className="btn btn-outline btn-sm topbar-action-btn" onClick={() => navigate('/app/orcamentos')} title="Novo Orçamento">
                    {IC.orcamentos}
                    <span className="action-label">Orçamento</span>
                  </button>
                </div>
                <div className="topbar-divider" />
                <button className="topbar-btn" title="Lembretes" onClick={() => navigate('/app/lembretes')} style={{ position: 'relative' }}>
                  {IC.lembretes}
                </button>
                <div className="topbar-divider" />
              </>
            )}
            <UserDropdown user={user} onLogout={logout} />
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
