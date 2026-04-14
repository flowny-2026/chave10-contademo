import { useEffect, useState } from 'react';
import { api } from '../../api';

const EMPTY = { cliente_id:'', veiculo_id:'', problema:'', servicos:'', pecas:'', valor_mo:'', valor_pecas:'', desconto:'', obs:'', status:'pendente', validade:'' };
const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; },
};
const STATUS_CLASS = { pendente:'badge-yellow', aprovado:'badge-green', rejeitado:'badge-red' };
const STATUS_LABEL = { pendente:'⏳ Pendente', aprovado:'✅ Aprovado', rejeitado:'❌ Rejeitado' };

function calcTotal(form) {
  return Math.max(0, (parseFloat(form.valor_mo)||0) + (parseFloat(form.valor_pecas)||0) - (parseFloat(form.desconto)||0));
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return <div className={`toast show ${type}`} style={{position:'fixed',bottom:24,right:24,zIndex:300}}>{msg}</div>;
}

export default function AppOrcamentos() {
  const [lista, setLista]       = useState([]);
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

  async function load() {
    try { const data = await api.app.orcamentos.list(); setLista(Array.isArray(data)?data:[]); }
    catch { setLista([]); }
  }

  useEffect(() => {
    Promise.all([api.app.clientes.list(), api.app.veiculos.list()])
      .then(([c,v])=>{ setClientes(c); setVeiculos(v); }).catch(()=>{});
    load();
  }, []);

  function openCreate() { setForm(EMPTY); setEditing(null); setModal('form'); }
  function openEdit(o) {
    setForm({ cliente_id:o.cliente_id||'', veiculo_id:o.veiculo_id||'', problema:o.descricao||'',
      servicos:o.servicos||'', pecas:o.pecas||'', valor_mo:o.valor_mo||'', valor_pecas:o.valor_pecas||'',
      desconto:o.desconto||'', obs:o.obs||'', status:o.status||'pendente', validade:o.validade||'' });
    setEditing(o.id); setModal('form');
  }

  async function save(e) {
    e.preventDefault();
    try {
      const payload = { ...form, cliente_id:form.cliente_id||null, veiculo_id:form.veiculo_id||null,
        descricao: form.problema, valor_mo:parseFloat(form.valor_mo)||0, valor_pecas:parseFloat(form.valor_pecas)||0,
        desconto:parseFloat(form.desconto)||0 };
      if (editing) await api.app.orcamentos.update(editing, payload);
      else await api.app.orcamentos.create(payload);
      setModal(null); load();
      showToast(editing ? 'Orçamento atualizado!' : 'Orçamento salvo!');
    } catch (err) { showToast(err.error||'Erro ao salvar', 'error'); }
  }

  async function remove(id) {
    if (!window.confirm('Deseja excluir este orçamento?')) return;
    await api.app.orcamentos.remove(id);
    load(); showToast('Orçamento excluído');
  }

  async function setStatus(id, status) {
    await api.app.orcamentos.setStatus(id, status);
    load(); showToast('Status atualizado');
  }

  function enviarWhatsApp(o) {
    const c = clientes.find(c=>c.id===o.cliente_id);
    if (!c?.telefone) { showToast('Cliente sem telefone cadastrado', 'error'); return; }
    const total = calcTotal({valor_mo:o.valor_mo,valor_pecas:o.valor_pecas,desconto:o.desconto||0});
    const msg = `Olá ${c.nome}! Segue o orçamento ${o.numero||''}:\n\n📌 Serviços: ${o.servicos||'-'}\n🔩 Peças: ${o.pecas||'-'}\n💰 Total: ${fmt.currency(total)}\n\nAguardo sua confirmação! 🔧`;
    const tel = c.telefone.replace(/\D/g,'');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  const veiculosFiltrados = form.cliente_id ? veiculos.filter(v=>String(v.cliente_id)===String(form.cliente_id)) : veiculos;
  const listaFiltrada = lista.filter(o => {
    const matchSearch = !search || (o.cliente_nome||'').toLowerCase().includes(search.toLowerCase()) || (o.numero||'').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFiltro || o.status === statusFiltro;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Orçamentos</div><div className="page-subtitle">{listaFiltrada.length} orçamento(s)</div></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Novo Orçamento</button>
      </div>
      <div className="search-bar">
        <div className="search-input-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar por cliente ou número..." value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="dash-select" value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value)}>
          <option value="">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="aprovado">Aprovados</option>
          <option value="rejeitado">Rejeitados</option>
        </select>
      </div>
      <div className="card">
        {listaFiltrada.length ? (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Veículo</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {listaFiltrada.map(o=>{
                  const total = calcTotal({valor_mo:o.valor_mo,valor_pecas:o.valor_pecas,desconto:o.desconto||0});
                  return (
                    <tr key={o.id}>
                      <td><strong>{o.numero||`ORC-${String(o.id).padStart(4,'0')}`}</strong></td>
                      <td style={{color:'var(--gray-500)',fontSize:12}}>{fmt.date(o.criado_em?.split('T')[0])}</td>
                      <td>{o.cliente_nome||'—'}</td>
                      <td>{o.veiculo_modelo||'—'}{o.placa&&<><br/><small style={{color:'var(--gray-400)'}}>{o.placa}</small></>}</td>
                      <td><strong>{fmt.currency(total)}</strong></td>
                      <td><span className={`badge ${STATUS_CLASS[o.status]||'badge-gray'}`}>{STATUS_LABEL[o.status]||o.status}</span></td>
                      <td>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          <button className="btn btn-outline btn-sm" onClick={()=>{setViewing(o);setModal('ver');}}>👁️ Ver</button>
                          <button className="btn btn-outline btn-sm" onClick={()=>enviarWhatsApp(o)} title="WhatsApp">💬</button>
                          <button className="btn btn-outline btn-sm" onClick={()=>openEdit(o)}>✏️</button>
                          <button className="btn btn-outline btn-sm" onClick={()=>remove(o.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><div className="empty-icon">📝</div><p>Nenhum orçamento encontrado</p><button className="btn btn-primary" onClick={openCreate}>Criar primeiro orçamento</button></div>
        )}
      </div>

      {modal==='form' && (
        <div className="modal-overlay open">
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header">
              <h2>{editing ? 'Editar Orçamento' : 'Novo Orçamento'}</h2>
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
                  <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                      <option value="pendente">⏳ Pendente</option>
                      <option value="aprovado">✅ Aprovado</option>
                      <option value="rejeitado">❌ Rejeitado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Validade</label>
                    <input type="date" value={form.validade} onChange={e=>setForm(f=>({...f,validade:e.target.value}))} />
                  </div>
                  <div className="form-group full"><label>Problema relatado</label><textarea value={form.problema} onChange={e=>setForm(f=>({...f,problema:e.target.value}))} placeholder="Descreva o problema..." /></div>
                  <div className="form-group full"><label>Serviços</label><textarea value={form.servicos} onChange={e=>setForm(f=>({...f,servicos:e.target.value}))} placeholder="Liste os serviços a realizar..." /></div>
                  <div className="form-group full"><label>Peças</label><textarea value={form.pecas} onChange={e=>setForm(f=>({...f,pecas:e.target.value}))} placeholder="Liste as peças necessárias..." /></div>
                  <div className="form-group"><label>Mão de obra (R$)</label><input type="number" step="0.01" min="0" value={form.valor_mo} onChange={e=>setForm(f=>({...f,valor_mo:e.target.value}))} placeholder="0,00" /></div>
                  <div className="form-group"><label>Valor das peças (R$)</label><input type="number" step="0.01" min="0" value={form.valor_pecas} onChange={e=>setForm(f=>({...f,valor_pecas:e.target.value}))} placeholder="0,00" /></div>
                  <div className="form-group"><label>Desconto (R$)</label><input type="number" step="0.01" min="0" value={form.desconto} onChange={e=>setForm(f=>({...f,desconto:e.target.value}))} placeholder="0,00" /></div>
                  <div className="form-group">
                    <label>Total</label>
                    <div style={{padding:'10px 13px',background:'var(--brand-light)',borderRadius:'var(--r-sm)',fontFamily:'Poppins,sans-serif',fontSize:16,fontWeight:800,color:'var(--brand)'}}>{fmt.currency(calcTotal(form))}</div>
                  </div>
                  <div className="form-group full"><label>Observações</label><textarea value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} placeholder="Condições, prazo, garantia..." /></div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">💾 Salvar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modal==='ver' && viewing && (()=>{
        const total = calcTotal({valor_mo:viewing.valor_mo,valor_pecas:viewing.valor_pecas,desconto:viewing.desconto||0});
        return (
          <div className="modal-overlay open">
            <div className="modal" style={{maxWidth:580}}>
              <div className="modal-header">
                <h2>{viewing.numero||`ORC-${String(viewing.id).padStart(4,'0')}`}</h2>
                <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'10px 14px',background:'var(--gray-50)',borderRadius:'var(--r-sm)'}}>
                  <span style={{fontSize:13,color:'var(--gray-500)'}}>Data: {fmt.date(viewing.criado_em?.split('T')[0])}</span>
                  <span className={`badge ${STATUS_CLASS[viewing.status]||'badge-gray'}`}>{STATUS_LABEL[viewing.status]||viewing.status}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                  {[{l:'Cliente',v:viewing.cliente_nome||'—'},{l:'Veículo',v:viewing.veiculo_modelo||'—'},{l:'Placa',v:viewing.placa||'—'},{l:'Validade',v:fmt.date(viewing.validade)}].map(item=>(
                    <div key={item.l}><div style={{fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:3}}>{item.l}</div><div style={{fontSize:13.5,color:'var(--gray-800)'}}>{item.v}</div></div>
                  ))}
                </div>
                {[{t:'Serviços',v:viewing.servicos},{t:'Peças',v:viewing.pecas},{t:'Observações',v:viewing.obs}].filter(s=>s.v).map(s=>(
                  <div key={s.t} style={{marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--gray-400)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>{s.t}</div>
                    <div style={{fontSize:13.5,color:'var(--gray-700)',background:'var(--gray-50)',padding:'10px 12px',borderRadius:'var(--r-sm)'}}>{s.v}</div>
                  </div>
                ))}
                <div style={{display:'flex',gap:12,marginBottom:12}}>
                  {[{l:'Mão de obra',v:viewing.valor_mo},{l:'Peças',v:viewing.valor_pecas},{l:'Desconto',v:viewing.desconto||0}].map(item=>(
                    <div key={item.l} style={{flex:1,background:'var(--gray-50)',padding:10,borderRadius:'var(--r-sm)',textAlign:'center'}}>
                      <div style={{fontSize:10,color:'var(--gray-400)',marginBottom:3}}>{item.l.toUpperCase()}</div>
                      <div style={{fontSize:15,fontWeight:700}}>{fmt.currency(item.v)}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',background:'var(--brand-light)',borderRadius:'var(--r-sm)',marginBottom:16}}>
                  <span style={{fontWeight:700,color:'var(--brand)'}}>Total</span>
                  <span style={{fontFamily:'Poppins,sans-serif',fontSize:20,fontWeight:800,color:'var(--brand)'}}>{fmt.currency(total)}</span>
                </div>
                <div className="form-actions">
                  <button className="btn btn-outline" onClick={()=>setModal(null)}>Fechar</button>
                  <button className="btn btn-outline" onClick={()=>enviarWhatsApp(viewing)}>💬 WhatsApp</button>
                  <button className="btn btn-primary" onClick={()=>openEdit(viewing)}>✏️ Editar</button>
                  {viewing.status==='pendente'&&<button className="btn btn-success" onClick={()=>setStatus(viewing.id,'aprovado')}>✅ Aprovar</button>}
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
