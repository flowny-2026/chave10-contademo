import { useEffect, useState } from 'react';
import { api } from '../../api';

const EMPTY = { cliente_id: '', veiculo_id: '', descricao: '', valor: '', observacao: '' };
const STATUS_CLASS = { em_andamento: 'badge-orange', finalizado: 'badge-green' };
const STATUS_LABEL = { em_andamento: 'Em andamento', finalizado: 'Finalizado' };

const fmt = {
  currency: v => 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
};

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300 }}>{msg}</div>;
}

export default function AppOS() {
  const [osList, setOsList] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: '' });

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  }

  async function load(status) {
    const data = await api.app.os.list(status || undefined);
    setOsList(data);
  }

  useEffect(() => {
    Promise.all([api.app.clientes.list(), api.app.veiculos.list()]).then(([c, v]) => {
      setClientes(c);
      setVeiculos(v);
    });
    load();
  }, []);

  function openCreate() { setForm(EMPTY); setEditing(null); setModal(true); }
  function openEdit(os) {
    setForm({
      cliente_id: os.cliente_id || '',
      veiculo_id: os.veiculo_id || '',
      descricao: os.descricao || '',
      valor: os.valor || '',
      observacao: os.observacao || '',
    });
    setEditing(os.id);
    setModal(true);
  }

  async function save(e) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        cliente_id: form.cliente_id || null,
        veiculo_id: form.veiculo_id || null,
        valor: parseFloat(form.valor) || 0,
      };
      if (editing) await api.app.os.update(editing, payload);
      else await api.app.os.create(payload);
      setModal(false);
      load(filterStatus);
      showToast(editing ? 'OS atualizada!' : 'OS criada!');
    } catch (err) {
      showToast(err.error || 'Erro ao salvar', 'error');
    }
  }

  async function toggleStatus(os) {
    const next = os.status === 'em_andamento' ? 'finalizado' : 'em_andamento';
    await api.app.os.setStatus(os.id, next);
    load(filterStatus);
    showToast(next === 'finalizado' ? 'OS finalizada!' : 'OS reaberta');
  }

  async function remove(id) {
    if (!window.confirm('Remover esta OS?')) return;
    await api.app.os.remove(id);
    load(filterStatus);
    showToast('OS removida');
  }

  function handleFilter(e) {
    setFilterStatus(e.target.value);
    load(e.target.value);
  }

  // Filter veiculos by selected client
  const veiculosFiltrados = form.cliente_id
    ? veiculos.filter(v => String(v.cliente_id) === String(form.cliente_id))
    : veiculos;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Ordens de Serviço</div>
          <div className="page-subtitle">{osList.length} ordens</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nova OS</button>
      </div>

      <div className="search-bar">
        <select className="dash-select" value={filterStatus} onChange={handleFilter}>
          <option value="">Todos os status</option>
          <option value="em_andamento">Em andamento</option>
          <option value="finalizado">Finalizadas</option>
        </select>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>#</th><th>Cliente</th><th>Veículo</th><th>Descrição</th><th>Valor</th><th>Status</th><th>Data</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {osList.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>Nenhuma OS encontrada</td></tr>
              )}
              {osList.map(os => (
                <tr key={os.id}>
                  <td style={{ fontWeight: 700, color: 'var(--brand)' }}>#{os.id}</td>
                  <td>{os.cliente_nome || '—'}</td>
                  <td>
                    <div>{os.veiculo_modelo || '—'}</div>
                    {os.placa && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{os.placa}</div>}
                  </td>
                  <td style={{ maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{os.descricao}</div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{fmt.currency(os.valor)}</td>
                  <td><span className={`badge ${STATUS_CLASS[os.status]}`}>{STATUS_LABEL[os.status]}</span></td>
                  <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{os.data}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(os)}>Editar</button>
                      <button
                        className={`btn btn-sm ${os.status === 'em_andamento' ? 'btn-success' : 'btn-outline'}`}
                        onClick={() => toggleStatus(os)}
                      >
                        {os.status === 'em_andamento' ? '✓ Finalizar' : '↩ Reabrir'}
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(os.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>{editing ? 'Editar OS' : 'Nova OS'}</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Cliente</label>
                    <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value, veiculo_id: '' }))}>
                      <option value="">Sem cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Veículo</label>
                    <select value={form.veiculo_id} onChange={e => setForm(f => ({ ...f, veiculo_id: e.target.value }))}>
                      <option value="">Sem veículo</option>
                      {veiculosFiltrados.map(v => <option key={v.id} value={v.id}>{v.modelo} {v.placa ? `(${v.placa})` : ''}</option>)}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Descrição do serviço *</label>
                    <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required placeholder="Descreva o serviço a ser realizado..." />
                  </div>
                  <div className="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
                  </div>
                  <div className="form-group">
                    <label>Observação</label>
                    <input value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
