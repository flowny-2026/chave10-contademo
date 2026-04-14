import { useEffect, useState } from 'react';
import { api } from '../../api';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
};

function BarChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 12 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{fmt.currency(d.total).replace('R$ ', '')}</div>
          <div style={{
            width: '100%', background: 'var(--accent)', borderRadius: 4,
            height: Math.max((d.total / max) * 90, d.total > 0 ? 4 : 0),
            opacity: 0.85,
          }} />
          <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{d.mes}</div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--gray-400)', padding: 20 }}>Carregando...</p>;
  if (!data) return null;

  const { stats, receitaMensal, recentes } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard Admin</div>
          <div className="page-subtitle">Visão geral do sistema</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card c-blue">
          <div className="stat-icon c-blue">🏪</div>
          <div className="stat-body">
            <div className="stat-value">{stats.totalOficinas}</div>
            <div className="stat-label">Total de oficinas</div>
          </div>
        </div>
        <div className="stat-card c-green">
          <div className="stat-icon c-green">✅</div>
          <div className="stat-body">
            <div className="stat-value">{stats.ativas}</div>
            <div className="stat-label">Ativas</div>
          </div>
        </div>
        <div className="stat-card c-orange">
          <div className="stat-icon c-orange">⚠️</div>
          <div className="stat-body">
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">Em atraso</div>
          </div>
        </div>
        <div className="stat-card c-red">
          <div className="stat-icon c-red">🔒</div>
          <div className="stat-body">
            <div className="stat-value">{stats.blocked}</div>
            <div className="stat-label">Bloqueadas</div>
          </div>
        </div>
        <div className="stat-card c-green">
          <div className="stat-icon c-green">💰</div>
          <div className="stat-body">
            <div className="stat-value" style={{ fontSize: 16 }}>{fmt.currency(stats.receitaMes)}</div>
            <div className="stat-label">Receita do mês</div>
          </div>
        </div>
        <div className="stat-card c-purple">
          <div className="stat-icon c-purple">📊</div>
          <div className="stat-body">
            <div className="stat-value" style={{ fontSize: 16 }}>{fmt.currency(stats.receitaTotal)}</div>
            <div className="stat-label">Receita total</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Receita mensal (6 meses)</div></div>
          <BarChart data={receitaMensal} />
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Últimos pagamentos</div></div>
          {recentes.length === 0 && <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>Nenhum pagamento ainda</p>}
          {recentes.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{p.nome_oficina}</div>
                <div style={{ color: 'var(--gray-400)', fontSize: 12 }}>{p.data_pagamento} · {p.forma_pagamento}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt.currency(p.valor)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
