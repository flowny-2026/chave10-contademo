import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; },
};

function BarChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d=>d.total),1);
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,marginTop:12}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
          <div style={{fontSize:10,color:'var(--gray-400)'}}>{d.total>0?fmt.currency(d.total).replace('R$ ',''):''}</div>
          <div style={{width:'100%',background:'var(--accent)',borderRadius:4,height:Math.max((d.total/max)*90,d.total>0?4:0),opacity:.85}} />
          <div style={{fontSize:10,color:'var(--gray-400)'}}>{d.mes}</div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData]         = useState(null);
  const [vencendo, setVencendo] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.allSettled([api.admin.dashboard(), api.admin.vencendo()])
      .then(([d, v]) => {
        if (d.status === 'fulfilled') setData(d.value);
        if (v.status === 'fulfilled') setVencendo(v.value);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--gray-400)'}}>Carregando...</div>;
  if (!data) return null;

  const { stats, receitaMensal, recentes } = data;

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Dashboard Admin</div><div className="page-subtitle">Visão geral do sistema</div></div>
        <button className="btn btn-primary" onClick={()=>navigate('/admin/oficinas')}>+ Nova Oficina</button>
      </div>

      {/* Alerta de vencimento */}
      {vencendo.length > 0 && (
        <div style={{background:'var(--warning-bg)',border:'1px solid rgba(217,119,6,.3)',borderRadius:'var(--r)',padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:20}}>⚠️</span>
            <div>
              <div style={{fontWeight:700,color:'var(--warning)',fontSize:14}}>{vencendo.length} oficina(s) vencendo nos próximos 7 dias</div>
              <div style={{fontSize:12,color:'var(--gray-500)',marginTop:2}}>{vencendo.map(o=>o.nome).join(', ')}</div>
            </div>
          </div>
          <button className="btn btn-sm" style={{background:'var(--warning)',color:'#fff'}} onClick={()=>navigate('/admin/oficinas')}>
            Ver oficinas →
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid" style={{marginBottom:24}}>
        <div className="stat-card c-blue">
          <div className="stat-icon c-blue"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
          <div className="stat-body"><div className="stat-value">{stats.totalOficinas}</div><div className="stat-label">Total de oficinas</div></div>
        </div>
        <div className="stat-card c-green">
          <div className="stat-icon c-green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
          <div className="stat-body"><div className="stat-value">{stats.ativas}</div><div className="stat-label">Ativas</div></div>
        </div>
        <div className="stat-card c-orange">
          <div className="stat-icon c-orange"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
          <div className="stat-body"><div className="stat-value">{stats.overdue}</div><div className="stat-label">Em atraso</div></div>
        </div>
        <div className="stat-card c-red">
          <div className="stat-icon c-red"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
          <div className="stat-body"><div className="stat-value">{stats.blocked}</div><div className="stat-label">Bloqueadas</div></div>
        </div>
        <div className="stat-card c-green">
          <div className="stat-icon c-green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
          <div className="stat-body"><div className="stat-value" style={{fontSize:16}}>{fmt.currency(stats.receitaMes)}</div><div className="stat-label">Receita do mês</div></div>
        </div>
        <div className="stat-card c-purple">
          <div className="stat-icon c-purple"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
          <div className="stat-body"><div className="stat-value" style={{fontSize:16}}>{fmt.currency(stats.receitaTotal)}</div><div className="stat-label">Receita total</div></div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div className="card">
          <div className="card-header"><div className="card-title">Receita mensal (6 meses)</div></div>
          <BarChart data={receitaMensal} />
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Últimos pagamentos</div></div>
          {recentes.length === 0
            ? <div className="empty-state" style={{padding:24}}><div className="empty-icon">💳</div><p>Nenhum pagamento ainda</p></div>
            : recentes.map(p=>(
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--gray-100)',fontSize:13}}>
                <div>
                  <div style={{fontWeight:600,color:'var(--gray-800)'}}>{p.nome_oficina}</div>
                  <div style={{color:'var(--gray-400)',fontSize:12}}>{fmt.date(p.data_pagamento)} · {p.forma_pagamento}</div>
                </div>
                <div style={{fontWeight:700,color:'var(--success)'}}>{fmt.currency(p.valor)}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
