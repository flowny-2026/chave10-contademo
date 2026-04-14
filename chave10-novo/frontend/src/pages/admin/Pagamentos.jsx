import { useEffect, useState } from 'react';
import { api } from '../../api';

const fmt = {
  currency: v => 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
};

export default function AdminPagamentos() {
  const [pagamentos, setPagamentos] = useState([]);
  const [oficinas, setOficinas] = useState([]);
  const [filterOficina, setFilterOficina] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [pags, ofs] = await Promise.all([
      api.admin.pagamentos.list(filterOficina || undefined),
      api.admin.oficinas.list(),
    ]);
    setPagamentos(pags);
    setOficinas(ofs);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterOficina]);

  const total = pagamentos.reduce((s, p) => s + parseFloat(p.valor || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Pagamentos</div>
          <div className="page-subtitle">{pagamentos.length} registros · Total: {fmt.currency(total)}</div>
        </div>
        <div className="page-actions">
          <select className="dash-select" value={filterOficina} onChange={e => setFilterOficina(e.target.value)}>
            <option value="">Todas as oficinas</option>
            {oficinas.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Oficina</th>
                <th>Valor</th>
                <th>Data</th>
                <th>Novo vencimento</th>
                <th>Forma</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>Carregando...</td></tr>}
              {!loading && pagamentos.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>Nenhum pagamento encontrado</td></tr>
              )}
              {pagamentos.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.nome_oficina}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt.currency(p.valor)}</td>
                  <td>{p.data_pagamento}</td>
                  <td>{p.novo_vencimento}</td>
                  <td><span className="badge badge-blue">{p.forma_pagamento}</span></td>
                  <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{p.observacao || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
