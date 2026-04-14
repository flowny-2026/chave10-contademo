import { useEffect, useState } from 'react';
import { api } from '../../api';

const EMPTY = { cliente_id: '', placa: '', modelo: '', ano: '' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300 }}>{msg}</div>;
}

export default function AppVeiculos() {
  const [veiculos, setVeiculos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [filterCliente, setFilterCliente] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: '' });

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  }

  async function load(cid) {
    const data = await api.app.veiculos.list(cid || undefined);
    setVeiculos(data);
  }

  useEffect(() => {
    api.app.clientes.list().then(setClientes);
    load();
  }, []);

  function openCreate() { setForm(EMPTY); setEditing(null); setModal(true); }
  function openEdit(v) { setForm({ cliente_id: v.cliente_id || '', placa: v.placa || '', modelo: v.modelo || '', ano: v.ano || '' }); setEditing(v.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    try {
      const payload = { ...form, cliente_id: form.cliente_id || null };
      if (editing) await api.app.veiculos.update(editing, payload);
      else await api.app.veiculos.create(payload);
      setModal(false);
      load(filterCliente);
      showToast(editing ? 'Veículo atualizado!' : 'Veículo criado!');
    } catch (err) {
      showToast(err.error || 'Erro ao salvar', 'error');
    }
  }

  async function remove(id) {
    if (!window.confirm('Remover este veículo?')) return;
    await api.app.veiculos.remove(id);
    load(filterCliente);
    showToast('Veículo removido');
  }

  function handleFilter(e) {
    setFilterCliente(e.target.value);
    load(e.target.value);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Veículos</div>
          <div className="page-subtitle">{veiculos.length} veículos</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Novo Veículo</button>
      </div>

      <div className="search-bar">
        <select className="dash-select" value={filterCliente} onChange={handleFilter}>
          <option value="">Todos os clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Modelo</th><th>Placa</th><th>Ano</th><th>Cliente</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {veiculos.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>Nenhum veículo encontrado</td></tr>
              )}
              {veiculos.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>{v.modelo}</td>
                  <td>{v.placa || '—'}</td>
                  <td>{v.ano || '—'}</td>
                  <td>{v.cliente_nome || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)}>Editar</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(v.id)}>🗑</button>
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
              <h2>{editing ? 'Editar Veículo' : 'Novo Veículo'}</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Modelo *</label>
                    <input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: Honda Civic" required />
                  </div>
                  <div className="form-group">
                    <label>Placa</label>
                    <input value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value }))} placeholder="ABC-1234" />
                  </div>
                  <div className="form-group">
                    <label>Ano</label>
                    <input value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} placeholder="2020" />
                  </div>
                  <div className="form-group full">
                    <label>Cliente</label>
                    <select value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                      <option value="">Sem cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
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
