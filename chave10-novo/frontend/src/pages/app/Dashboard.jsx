import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const STATUS_CLASS = { em_andamento: 'badge-orange', finalizado: 'badge-green' };
const STATUS_LABEL = { em_andamento: 'Em andamento', finalizado: 'Finalizado' };

export default function AppDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.app.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--gray-400)', padding: 20 }}>Carregando...</p>;
  if (!data) return null;

  const { stats, recentes, faturamentoMensal } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Visão geral da sua oficina</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/app/os')}>+ Nova OS</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card c-orange">
          <div className="stat-icon c-orange">🔧</div>
          <div className="stat-body">
            <div className="stat-value">{stats.emAndamento}</div>
            <div className="stat-label">OS em andamento</div>
          </div>
        </div>
        <div className="stat-card c-green">
          <div className="stat-icon c-green">✅</div>
          <div className="stat-body">
            <div className="stat-value">{stats.finalizadasHoje}</div>
            <div className="stat-label">Finalizadas hoje</div>
          </div>
        </div>
        <div className="stat-card c-blue">
          <div className="stat-icon c-blue">💰</div>
          <div className="stat-body">
            <div className="stat-value" style={{ fontSize: 16 }}>{fmt.currency(stats.faturamentoMes)}</div>
            <div className="stat-label">Faturamento do mês</div>
          </div>
        </div>
        <div className="stat-card c-purple">
          <div className="stat-icon c-purple">👥</div>
          <div className="stat-body">
            <div className="stat-value">{stats.totalClientes}</div>
            <div className="stat-label">Total de clientes</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Faturamento mensal</div></div>
          <BarChart data={faturamentoMensal} />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">OS recentes</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/os')}>Ver todas</button>
          </div>
          {recentes.length === 0 && <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>Nenhuma OS ainda</p>}
          {recentes.map(os => (
            <div key={os.id} className="dash-os-row">
              <div className="dash-os-num">#{os.id}</div>
              <div className="dash-os-info">
                <div className="dash-os-cliente">{os.cliente_nome || '—'}</div>
                <div className="dash-os-veiculo">{os.veiculo_modelo || '—'} {os.placa ? `· ${os.placa}` : ''}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span className={`badge ${STATUS_CLASS[os.status]}`}>{STATUS_LABEL[os.status]}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)' }}>{fmt.currency(os.valor)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
