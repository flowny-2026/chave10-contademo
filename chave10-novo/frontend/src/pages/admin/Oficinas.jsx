import { useEffect, useState } from 'react';
import { api } from '../../api';

const STATUS_LABEL = { active: 'Ativa', pending: 'Pendente', overdue: 'Em atraso', blocked: 'Bloqueada' };
const STATUS_CLASS = { active: 'badge-green', pending: 'badge-yellow', overdue: 'badge-orange', blocked: 'badge-red' };

const EMPTY = { nome: '', responsavel: '', telefone: '', email: '', plano: 'mensal', data_vencimento: '', observacoes: '' };
const EMPTY_USER = { nome: '', email: '', senha: '', perfil: 'admin_oficina' };
const EMPTY_PAG = { valor: '', data_pagamento: new Date().toISOString().split('T')[0], novo_vencimento: '', forma_pagamento: 'pix', observacao: '' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`toast show ${type}`} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 300 }}>
      {msg}
    </div>
  );
}

export default function AdminOficinas() {
  const [oficinas, setOficinas] = useState([]);
  const [modal, setModal] = useState(null); // null | 'oficina' | 'usuario' | 'pagamento'
  const [form, setForm] = useState(EMPTY);
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [pagForm, setPagForm] = useState(EMPTY_PAG);
  const [editing, setEditing] = useState(null);
  const [selectedOficina, setSelectedOficina] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [filterStatus, setFilterStatus] = useState('');

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  }

  async function load() {
    const data = await api.admin.oficinas.list(filterStatus || undefined);
    setOficinas(data);
  }

  useEffect(() => { load(); }, [filterStatus]);

  function openCreate() { setForm(EMPTY); setEditing(null); setModal('oficina'); }
  function openEdit(o) { setForm({ ...o }); setEditing(o.id); setModal('oficina'); }

  async function saveOficina(e) {
    e.preventDefault();
    try {
      if (editing) await api.admin.oficinas.update(editing, form);
      else await api.admin.oficinas.create(form);
      setModal(null);
      load();
      showToast(editing ? 'Oficina atualizada!' : 'Oficina criada!');
    } catch (err) {
      showToast(err.error || 'Erro ao salvar', 'error');
    }
  }

  async function removeOficina(id) {
    if (!window.confirm('Remover esta oficina?')) return;
    await api.admin.oficinas.remove(id);
    load();
    showToast('Oficina removida');
  }

  async function setStatus(id, status) {
    await api.admin.oficinas.setStatus(id, status);
    load();
    showToast('Status atualizado');
  }

  async function saveUsuario(e) {
    e.preventDefault();
    try {
      await api.admin.usuarios.create({ ...userForm, oficina_id: selectedOficina.id });
      setModal(null);
      showToast('Usuário criado!');
    } catch (err) {
      showToast(err.error || 'Erro ao criar usuário', 'error');
    }
  }

  async function savePagamento(e) {
    e.preventDefault();
    try {
      await api.admin.pagamentos.create({ ...pagForm, oficina_id: selectedOficina.id });
      setModal(null);
      load();
      showToast('Pagamento registrado!');
    } catch (err) {
      showToast(err.error || 'Erro ao registrar', 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Oficinas</div>
          <div className="page-subtitle">{oficinas.length} oficinas cadastradas</div>
        </div>
        <div className="page-actions">
          <select className="dash-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="pending">Pendentes</option>
            <option value="overdue">Em atraso</option>
            <option value="blocked">Bloqueadas</option>
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ Nova Oficina</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Responsável</th>
                <th>Plano</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {oficinas.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 32 }}>Nenhuma oficina cadastrada</td></tr>
              )}
              {oficinas.map(o => (
                <tr key={o.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{o.email}</div>
                  </td>
                  <td>{o.responsavel || '—'}</td>
                  <td>{o.plano}</td>
                  <td>{o.data_vencimento || '—'}</td>
                  <td><span className={`badge ${STATUS_CLASS[o.status_assinatura]}`}>{STATUS_LABEL[o.status_assinatura]}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(o)}>Editar</button>
                      <button className="btn btn-outline btn-sm" onClick={() => { setSelectedOficina(o); setUserForm(EMPTY_USER); setModal('usuario'); }}>+ Login</button>
                      <button className="btn btn-success btn-sm" onClick={() => { setSelectedOficina(o); setPagForm({ ...EMPTY_PAG }); setModal('pagamento'); }}>💳 Pagar</button>
                      {o.status_assinatura !== 'blocked' && (
                        <button className="btn btn-danger btn-sm" onClick={() => setStatus(o.id, 'blocked')}>Bloquear</button>
                      )}
                      {o.status_assinatura === 'blocked' && (
                        <button className="btn btn-success btn-sm" onClick={() => setStatus(o.id, 'active')}>Ativar</button>
                      )}
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeOficina(o.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Oficina */}
      {modal === 'oficina' && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>{editing ? 'Editar Oficina' : 'Nova Oficina'}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={saveOficina}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nome *</label>
                    <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Responsável</label>
                    <input value={form.responsavel || ''} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Telefone</label>
                    <input value={form.telefone || ''} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Plano</label>
                    <select value={form.plano} onChange={e => setForm(f => ({ ...f, plano: e.target.value }))}>
                      <option value="mensal">Mensal</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vencimento</label>
                    <input type="date" value={form.data_vencimento || ''} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} />
                  </div>
                  <div className="form-group full">
                    <label>Observações</label>
                    <textarea value={form.observacoes || ''} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Usuário */}
      {modal === 'usuario' && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>Criar login — {selectedOficina?.nome}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={saveUsuario}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nome *</label>
                    <input value={userForm.nome} onChange={e => setUserForm(f => ({ ...f, nome: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Senha *</label>
                    <input type="password" value={userForm.senha} onChange={e => setUserForm(f => ({ ...f, senha: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Perfil</label>
                    <select value={userForm.perfil} onChange={e => setUserForm(f => ({ ...f, perfil: e.target.value }))}>
                      <option value="admin_oficina">Admin Oficina</option>
                      <option value="funcionario">Funcionário</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Criar login</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagamento */}
      {modal === 'pagamento' && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2>Registrar pagamento — {selectedOficina?.nome}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={savePagamento}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Valor (R$) *</label>
                    <input type="number" step="0.01" min="0" value={pagForm.valor} onChange={e => setPagForm(f => ({ ...f, valor: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Forma de pagamento</label>
                    <select value={pagForm.forma_pagamento} onChange={e => setPagForm(f => ({ ...f, forma_pagamento: e.target.value }))}>
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="transferencia">Transferência</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Data do pagamento</label>
                    <input type="date" value={pagForm.data_pagamento} onChange={e => setPagForm(f => ({ ...f, data_pagamento: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Novo vencimento *</label>
                    <input type="date" value={pagForm.novo_vencimento} onChange={e => setPagForm(f => ({ ...f, novo_vencimento: e.target.value }))} required />
                  </div>
                  <div className="form-group full">
                    <label>Observação</label>
                    <textarea value={pagForm.observacao} onChange={e => setPagForm(f => ({ ...f, observacao: e.target.value }))} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Registrar</button>
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
