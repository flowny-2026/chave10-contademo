import { useEffect, useState } from 'react';
import { api } from '../../api';

const EMPTY = { nome: '', telefone: '' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300 }}>{msg}</div>;
}

export default function AppClientes() {
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: '' });

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  }

  async function load(q) {
    const data = await api.app.clientes.list(q);
    setClientes(data);
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setForm(EMPTY); setEditing(null); setModal(true); }
  function openEdit(c) { setForm({ nome: c.nome, telefone: c.telefone || '' }); setEditing(c.id); setModal(true); }

  async function save(e) {
    e.preventDefault();
    try {
      if (editing) await api.app.clientes.update(editing, form);
      else await api.app.clientes.create(form);
      setModal(false);
      load(search);
      showToast(editing ? 'Cliente atualizado!' : 'Cliente criado!');
    } catch (err) {
      showToast(err.error || 'Erro ao salvar', 'error');
    }
  }

  async function remove(id) {
    if (!window.confirm('Remover este cliente?')) return;
    await api.app.clientes.remove(id);
    load(search);
    showToast('Cliente removido');
  }

  function handleSearch(e) {
    setSearch(e.target.value);
    load(e.target.value);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-subtitle">{clientes.length} clientes</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Novo Cliente</button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar cliente..." value={search} onChange={handleSearch} />
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Nome</th><th>Telefone</th><th>Cadastro</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {clientes.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>Nenhum cliente encontrado</td></tr>
              )}
              {clientes.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nome}</td>
                  <td>{c.telefone || '—'}</td>
                  <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{c.data_criacao}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Editar</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => remove(c.id)}>🗑</button>
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
              <h2>{editing ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save}>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Nome *</label>
                    <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
                  </div>
                  <div className="form-group full">
                    <label>Telefone</label>
                    <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
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
