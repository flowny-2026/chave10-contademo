import { useEffect, useState } from 'react';
import { api } from '../../api';

const EMPTY = { cliente_id:'', veiculo_id:'', problema:'', servicos:'', pecas:'', valor_mo:'', valor_pecas:'', desconto:'', obs:'', status:'pendente', validade:'' };
const fmt = {
  currency: v => 'R$ ' + parseFloat(v||0).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.'),
  date: iso => { if(!iso) return '-'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; },
};
const STATUS_CLASS = { pendente:'badge-yellow', aprovado:'badge-green', rejeitado:'badge-red' };
const STATUS_LABEL = { pendente:'⏳ Pendente', aprovado:'✅ Aprovado', rejeitado:'❌ Rejeitado' };

function getOficina() { try { return JSON.parse(localStorage.getItem('c10_oficina'))||{}; } catch { return {}; } }

function calcTotal(form) {
  return Math.max(0, (parseFloat(form.valor_mo)||0) + (parseFloat(form.valor_pecas)||0) - (parseFloat(form.desconto)||0));
}

function gerarHTMLOrcamento(orc, clientes, veiculos) {
  const of  = getOficina();
  const c   = clientes.find(x=>x.id===orc.cliente_id);
  const v   = veiculos.find(x=>x.id===orc.veiculo_id);
  const mo  = parseFloat(orc.valor_mo||0);
  const pec = parseFloat(orc.valor_pecas||0);
  const des = parseFloat(orc.desconto||0);
  const total = Math.max(0, mo+pec-des);
  const num = orc.numero||`ORC-${String(orc.id).padStart(4,'0')}`;
  const statusColor = orc.status==='aprovado'?'#16a34a':orc.status==='rejeitado'?'#dc2626':'#d97706';

  const logoHtml = of.logo
    ? `<img src="${of.logo}" style="max-height:60px;max-width:180px;object-fit:contain" alt="Logo" />`
    : `<div style="font-size:28px;font-weight:800;color:#1E3A5F;font-family:Arial,sans-serif">Chave <span style="color:#F97316">10</span></div>`;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Orçamento ${num}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;padding:32px;max-width:800px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #1E3A5F}
    .oficina-info{font-size:11px;color:#6B7280;margin-top:6px;line-height:1.6}
    .orc-num{font-size:20px;font-weight:700;color:#1E3A5F}
    .section{margin-bottom:20px}
    .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6B7280;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #E5E7EB}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}
    .field label{font-size:11px;color:#9CA3AF;display:block;margin-bottom:2px}
    .field span{font-size:13px;color:#1a1a1a}
    table{width:100%;border-collapse:collapse;margin-top:4px}
    th{background:#F3F4F6;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6B7280;border:1px solid #E5E7EB}
    td{padding:8px 10px;border:1px solid #E5E7EB;font-size:13px}
    .valor-row{display:flex;justify-content:space-between;padding:7px 10px;font-size:13px}
    .total-final{background:#1E3A5F;color:#fff;border-radius:6px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-top:8px}
    .total-final .val{font-size:22px;font-weight:800;color:#F97316}
    .status-badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${statusColor}20;color:${statusColor};border:1px solid ${statusColor}40}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;text-align:center;font-size:11px;color:#9CA3AF}
    .nota{background:#FFF7ED;border:1px solid #FED7AA;border-radius:6px;padding:10px 14px;font-size:12px;color:#92400E;margin-top:16px}
    @media print{body{padding:16px}.no-print{display:none}}
  </style></head><body>
  <div class="header">
    <div>
      ${logoHtml}
      <div class="oficina-info">
        ${of.nome?`<strong>${of.nome}</strong><br/>`:''}
        ${of.documento?`CNPJ/CPF: ${of.documento}<br/>`:''}
        ${of.endereco?`${of.endereco}<br/>`:''}
        ${of.telefone?`Tel: ${of.telefone}  `:''}${of.whatsapp?`WhatsApp: ${of.whatsapp}`:''}
      </div>
    </div>
    <div style="text-align:right">
      <div class="orc-num">${num}</div>
      <div style="font-size:12px;color:#6B7280;margin-top:4px">Emissão: ${new Date().toLocaleDateString('pt-BR')}</div>
      ${orc.validade?`<div style="font-size:12px;color:#6B7280">Válido até: ${fmt.date(orc.validade)}</div>`:''}
      <div style="margin-top:6px"><span class="status-badge">${STATUS_LABEL[orc.status]||orc.status}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="grid-2">
      <div class="field"><label>Nome</label><span>${c?.nome||'—'}</span></div>
      <div class="field"><label>Telefone</label><span>${c?.telefone||'—'}</span></div>
      <div class="field"><label>Email</label><span>${c?.email||'—'}</span></div>
      <div class="field"><label>Endereço</label><span>${c?.endereco||'—'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Veículo</div>
    <div class="grid-2">
      <div class="field"><label>Veículo</label><span>${v?`${v.marca} ${v.modelo}`:'—'}</span></div>
      <div class="field"><label>Placa</label><span>${v?.placa||'—'}</span></div>
      <div class="field"><label>Ano</label><span>${v?.ano||'—'}</span></div>
      <div class="field"><label>KM</label><span>${v?.km?parseInt(v.km).toLocaleString('pt-BR')+' km':'—'}</span></div>
    </div>
  </div>

  ${orc.descricao?`<div class="section"><div class="section-title">Problema relatado</div><p style="background:#F9FAFB;padding:10px 12px;border-radius:6px">${orc.descricao}</p></div>`:''}

  <div class="section">
    <div class="section-title">Serviços e Peças</div>
    <table>
      <thead><tr><th>Descrição</th><th style="width:80px;text-align:center">Qtd</th><th style="width:120px;text-align:right">Valor unit.</th><th style="width:120px;text-align:right">Subtotal</th></tr></thead>
      <tbody>
        ${orc.servicos?`<tr><td colspan="4" style="background:#F3F4F6;font-weight:600;font-size:12px;color:#374151">🔧 SERVIÇOS</td></tr>
        ${orc.servicos.split('\n').filter(s=>s.trim()).map(s=>`<tr><td>${s}</td><td></td><td></td><td></td></tr>`).join('')}`:''}
        ${orc.pecas?`<tr><td colspan="4" style="background:#F3F4F6;font-weight:600;font-size:12px;color:#374151">🔩 PEÇAS</td></tr>
        ${orc.pecas.split('\n').filter(p=>p.trim()).map(p=>`<tr><td>${p}</td><td></td><td></td><td></td></tr>`).join('')}`:''}
        ${!orc.servicos&&!orc.pecas?`<tr><td colspan="4" style="color:#9CA3AF;text-align:center">Nenhum item registrado</td></tr>`:''}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Valores</div>
    <div style="background:#F9FAFB;border-radius:6px;overflow:hidden;border:1px solid #E5E7EB">
      <div class="valor-row"><span>Mão de obra</span><span>${fmt.currency(mo)}</span></div>
      <div class="valor-row" style="border-top:1px solid #E5E7EB"><span>Peças</span><span>${fmt.currency(pec)}</span></div>
      ${des>0?`<div class="valor-row" style="border-top:1px solid #E5E7EB;color:#dc2626"><span>Desconto</span><span>- ${fmt.currency(des)}</span></div>`:''}
    </div>
    <div class="total-final"><span style="font-size:16px;font-weight:700">TOTAL DO ORÇAMENTO</span><span class="val">${fmt.currency(total)}</span></div>
  </div>

  ${orc.obs?`<div class="nota">📌 <strong>Observações:</strong> ${orc.obs}</div>`:''}

  <div class="footer">
    ${of.nome||'Chave 10'} ${of.telefone?'· '+of.telefone:''} ${of.email?'· '+of.email:''}<br/>
    Orçamento gerado em ${new Date().toLocaleDateString('pt-BR')} — válido por 7 dias a partir da emissão
  </div>
  </body></html>`;
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

  function imprimir(orc) {
    const html = gerarHTMLOrcamento(orc, clientes, veiculos);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  function enviarWhatsAppOrc(orc) {
    const c = clientes.find(x=>x.id===orc.cliente_id);
    if (!c?.telefone) { showToast('Cliente sem telefone cadastrado','error'); return; }
    const of = getOficina();
    const v = veiculos.find(x=>x.id===orc.veiculo_id);
    const mo = parseFloat(orc.valor_mo||0);
    const pec = parseFloat(orc.valor_pecas||0);
    const des = parseFloat(orc.desconto||0);
    const total = Math.max(0,mo+pec-des);
    const num = orc.numero||`ORC-${String(orc.id).padStart(4,'0')}`;
    let msg = `*Orçamento ${num} — ${of.nome||'Chave 10'}*\n`;
    msg += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`;
    if (orc.validade) msg += `Válido até: ${fmt.date(orc.validade)}\n`;
    msg += `\n*Veículo:* ${v?`${v.marca} ${v.modelo} — ${v.placa}`:'—'}\n`;
    if (orc.descricao) msg += `*Problema:* ${orc.descricao}\n`;
    if (orc.servicos) msg += `\n*Serviços:*\n${orc.servicos}\n`;
    if (orc.pecas) msg += `\n*Peças:*\n${orc.pecas}\n`;
    msg += `\n💰 *Mão de obra:* ${fmt.currency(mo)}`;
    msg += `\n🔩 *Peças:* ${fmt.currency(pec)}`;
    if (des>0) msg += `\n🏷️ *Desconto:* - ${fmt.currency(des)}`;
    msg += `\n\n*TOTAL: ${fmt.currency(total)}*`;
    if (orc.obs) msg += `\n\n📌 ${orc.obs}`;
    msg += `\n\n_${of.nome||'Chave 10'}${of.telefone?' · '+of.telefone:''}_ `;
    const tel = c.telefone.replace(/\D/g,'');
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async function save(e) {    e.preventDefault();
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
                          <button className="btn btn-outline btn-sm" onClick={()=>imprimir(o)} title="Imprimir PDF">🖨️</button>
                          <button className="btn btn-outline btn-sm" onClick={()=>enviarWhatsAppOrc(o)} title="WhatsApp">💬</button>
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
                  <button className="btn btn-outline" onClick={()=>imprimir(viewing)}>🖨️ Imprimir</button>
                  <button className="btn btn-outline" onClick={()=>enviarWhatsAppOrc(viewing)}>💬 WhatsApp</button>
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
