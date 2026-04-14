import { useEffect, useState } from 'react';
import { api } from '../../api';

const EMPTY = { cliente_id:'', veiculo_id:'', descricao:'', servicos:'', pecas:'', valor_mo:'', valor_pecas:'', data: new Date().toISOString().split('T')[0], status:'em_andamento', observacao:'' };
const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; },
};
const STATUS_CLASS = { em_andamento:'badge-orange', finalizado:'badge-green' };
const STATUS_LABEL = { em_andamento:'Em andamento', finalizado:'Finalizado' };

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{position:'fixed',bottom:24,right:24,zIndex:300}}>{msg}</div>;
}

export default function AppOS() {
  const [osList, setOsList]     = useState([]);
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [search, setSearch]     = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [editing, setEditing]   = useState(null);
  const [viewing, setViewing]   = useState(null);
  const [toast, setToast]       = useState({ msg:'', type:'' });

  function showToast(msg, type='success') {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg:'', type:'' }), 3000);
  }

  async function load(status) {
    try { const data = await api.app.os.list(status||undefined); setOsList(data); }
    catch { setOsList([]); }
  }

  useEffect(() => {
    Promise.all([api.app.clientes.list(), api.app.veiculos.list()])
      .then(([c,v]) => { setClientes(c); setVeiculos(v); }).catch(()=>{});
    load();
  }, []);

  function openCreate() { setForm({...EMPTY, data: new Date().toISOString().split('T')[0]}); setEditing(null); setModal('form'); }
  function openEdit(os) {
    setForm({ cliente_id:os.cliente_id||'', veiculo_id:os.veiculo_id||'', descricao:os.descricao||'',
      servicos:os.servicos||'', pecas:os.pecas||'', valor_mo:os.valor_mo||'', valor_pecas:os.valor_pecas||'',
      data:os.data||new Date().toISOString().split('T')[0], status:os.status||'em_andamento', observacao:os.observacao||'' });
    setEditing(os.id); setModal('form');
  }

  async function save(e) {
    e.preventDefault();
    if (!form.descricao.trim()) { showToast('Problema/descrição é obrigatório', 'error'); return; }
    try {
      const payload = { ...form, cliente_id:form.cliente_id||null, veiculo_id:form.veiculo_id||null,
        valor_mo:parseFloat(form.valor_mo)||0, valor_pecas:parseFloat(form.valor_pecas)||0,
        valor:(parseFloat(form.valor_mo)||0)+(parseFloat(form.valor_pecas)||0) };
      if (editing) await api.app.os.update(editing, payload);
      else await api.app.os.create(payload);
      setModal(null); load(statusFiltro);
      showToast(editing ? 'OS atualizada!' : 'Ordem de serviço salva!');
    } catch (err) { showToast(err.error||'Erro ao salvar', 'error'); }
  }

  async function finalizar(id) { await api.app.os.setStatus(id,'finalizado'); load(statusFiltro); setModal(null); showToast('OS finalizada!'); }
  async function reabrir(id)   { await api.app.os.setStatus(id,'em_andamento'); load(statusFiltro); showToast('OS reaberta'); }
  async function remove(id) {
    if (!window.confirm('Deseja excluir esta ordem de serviço?')) return;
    await api.app.os.remove(id); load(statusFiltro); showToast('OS excluída');
  }

  const veiculosFiltrados = form.cliente_id ? veiculos.filter(v=>String(v.cliente_id)===String(form.cliente_id)) : veiculos;
  const listaFiltrada = search
    ? osList.filter(o=>(o.cliente_nome||'').toLowerCase().includes(search.toLowerCase())||(o.veiculo_modelo||'').toLowerCase().includes(search.toLowerCase())||String(o.id).includes(search)||(o.descricao||'').toLowerCase().includes(search.toLowerCase()))
    : osList;

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Ordens de Serviço</div><div className="page-subtitle">{listaFiltrada.length} ordem(ns)</div></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nova OS</button>
      </div>
      <div className="search-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por cliente, veículo ou nº OS..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="dash-select" value={statusFiltro} onChange={e=>{setStatusFiltro(e.target.value);load(e.target.value);}}>
          <option value="">Todos</option>
          <option value="em_andamento">Em andamento</option>
          <option value="finalizado">Finalizados</option>
        </select>
      </div>
      <div className="card">
        {listaFiltrada.length ? (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>OS</th><th>Data</th><th>Cliente</th><th>Veículo</th><th>Problema</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {listaFiltrada.map(os => {
                  const total = parseFloat(os.valor_mo||0)+parseFloat(os.valor_pecas||0)||parseFloat(os.valor||0);
                  return (
                    <tr key={os.id}>
                      <td><strong style={{color:'var(--brand)'}}>#{String(os.id).padStart(4,'0')}</strong></td>
                      <td style={{color:'var(--gray-500)',fontSize:12}}>{fmt.date(os.data)}</td>
                      <td>{os.cliente_nome||'—'}</td>
                      <td><div>{os.veiculo_modelo||'—'}</div>{os.placa&&<small style={{color:'var(--gray-400)'}}>{os.placa}</small>}</td>
                      <td style={{maxWidth:180,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{os.descricao}</td>
                      <td><strong>{fmt.currency(total)}</strong></td>
                      <td><span className={`badge ${STATUS_CLASS[os.status]||'badge-gray'}`}>{STATUS_LABEL[os.status]||os.status}</span></td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          <button className="btn btn-outline btn-sm" onClick={()=>{setViewing(os);setModal('ver');}}>👁️ Ver</button>
                          <button className="btn btn-outline btn-sm" onClick={()=>openEdit(os)}>✏️</button>
                          <button className="btn btn-outline btn-sm" onClick={()=>remove(os.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><div className="empty-icon">📋</div><p>Nenhuma ordem encontrada</p><button className="btn btn-primary" onClick={openCreate}>Criar primeira OS</button></div>
        )}
      </div>

      {modal==='form' && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header">
              <h2>{editing ? `Editar OS #${String(editing).padStart(4,'0')}` : 'Nova Ordem de Serviço'}</h2>
              <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={save}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Cliente</label>
                    <select value={form.cliente_id} onChange={e=>setForm(f=>({...f,cliente_id:e.target.value,veiculo_id:''}))}>
                      <option value="">Selecionar...</option>
                      {clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Veículo</label>
                    <select value={form.veiculo_id} onChange={e=>setForm(f=>({...f,veiculo_id:e.target.value}))}>
                      <option value="">Selecionar...</option>
                      {veiculosFiltrados.map(v=><option key={v.id} value={v.id}>{v.marca} {v.modelo} — {v.placa}</option>)}
                    </select>
                  </div>
                  <div className="form-group full"><label>Problema relatado *</label><textarea value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Descreva o problema..." required /></div>
                  <div className="form-group full"><label>Serviços realizados</label><textarea value={form.servicos} onChange={e=>setForm(f=>({...f,servicos:e.target.value}))} placeholder="Liste os serviços feitos..." /></div>
                  <div className="form-group full"><label>Peças utilizadas</label><textarea value={form.pecas} onChange={e=>setForm(f=>({...f,pecas:e.target.value}))} placeholder="Liste as peças..." /></div>
                  <div className="form-group"><label>Valor mão de obra (R$)</label><input type="number" step="0.01" min="0" value={form.valor_mo} onChange={e=>setForm(f=>({...f,valor_mo:e.target.value}))} placeholder="0,00" /></div>
                  <div className="form-group"><label>Valor das peças (R$)</label><input type="number" step="0.01" min="0" value={form.valor_pecas} onChange={e=>setForm(f=>({...f,valor_pecas:e.target.value}))} placeholder="0,00" /></div>
                  <div className="form-group"><label>Data</label><input type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} /></div>
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                      <option value="em_andamento">🔧 Em andamento</option>
                      <option value="finalizado">✅ Finalizado</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">💾 Salvar OS</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modal==='ver' && viewing && (()=>{
        const total = parseFloat(viewing.valor_mo||0)+parseFloat(viewing.valor_pecas||0)||parseFloat(viewing.valor||0);
        return (
          <div className="modal-overlay open">
            <div className="modal" style={{maxWidth:580}}>
              <div className="modal-header">
                <h2>OS #{String(viewing.id).padStart(4,'0')}</h2>
                <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                  {[{l:'Cliente',v:viewing.cliente_nome||'—'},{l:'Telefone',v:viewing.cliente_telefone||'—'},{l:'Veículo',v:viewing.veiculo_modelo||'—'},{l:'Placa',v:viewing.placa||'—'},{l:'Data',v:fmt.date(viewing.data)},{l:'Status',v:<span className={`badge ${STATUS_CLASS[viewing.status]||'badge-gray'}`}>{STATUS_LABEL[viewing.status]||viewing.status}</span>}].map(item=>(
                    <div key={item.l}><div style={{fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:3}}>{item.l}</div><div style={{fontSize:13.5,color:'var(--gray-800)'}}>{item.v}</div></div>
                  ))}
                </div>
                {[{t:'Problema relatado',v:viewing.descricao},{t:'Serviços realizados',v:viewing.servicos},{t:'Peças utilizadas',v:viewing.pecas}].filter(s=>s.v).map(s=>(
                  <div key={s.t} style={{marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>{s.t}</div>
                    <div style={{fontSize:13.5,color:'var(--gray-700)',background:'var(--gray-50)',padding:'10px 12px',borderRadius:'var(--r-sm)'}}>{s.v}</div>
                  </div>
                ))}
                <div style={{display:'flex',gap:12,marginBottom:12}}>
                  {[{l:'Mão de obra',v:viewing.valor_mo},{l:'Peças',v:viewing.valor_pecas}].map(item=>(
                    <div key={item.l} style={{flex:1,background:'var(--gray-50)',padding:12,borderRadius:'var(--r-sm)',textAlign:'center'}}>
                      <div style={{fontSize:11,color:'var(--gray-400)',marginBottom:4}}>{item.l.toUpperCase()}</div>
                      <div style={{fontSize:18,fontWeight:700}}>{fmt.currency(item.v)}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',background:'var(--brand-light)',borderRadius:'var(--r-sm)',marginBottom:16}}>
                  <span style={{fontWeight:700,color:'var(--brand)'}}>Total</span>
                  <span style={{fontFamily:'Poppins,sans-serif',fontSize:20,fontWeight:800,color:'var(--brand)'}}>{fmt.currency(total)}</span>
                </div>
                <div className="form-actions">
                  <button className="btn btn-outline" onClick={()=>setModal(null)}>Fechar</button>
                  <button className="btn btn-primary" onClick={()=>openEdit(viewing)}>✏️ Editar</button>
                  {viewing.status==='em_andamento'&&<button className="btn btn-success" onClick={()=>finalizar(viewing.id)}>✅ Finalizar</button>}
                  {viewing.status==='finalizado'&&<button className="btn btn-outline" onClick={()=>reabrir(viewing.id)}>↩ Reabrir</button>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}
