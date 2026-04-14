// ===== DATA LAYER =====
// Modo API: usa backend Node.js (dados persistentes no SQLite)
// Modo local: usa localStorage (demo/offline)

const isApiMode = () => sessionStorage.getItem('of_mode') === 'api';

// ── Cache em memória para modo API (evita re-fetch desnecessário) ──
const _cache = {};
function cacheSet(key, data) { _cache[key] = { data, ts: Date.now() }; }
function cacheGet(key, ttl = 30000) {
  const c = _cache[key];
  return (c && Date.now() - c.ts < ttl) ? c.data : null;
}
function cacheInvalidate(key) { delete _cache[key]; }

// ── localStorage helpers ──────────────────────────────────────
const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem('of_' + key)) || []; }
    catch { return []; }
  },
  set(key, val) { localStorage.setItem('of_' + key, JSON.stringify(val)); },
  nextId(key) {
    const items = this.get(key);
    return items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
  }
};

// ── Normaliza campos snake_case (API) → camelCase (app) ──────
function normCliente(c) {
  return { id: c.id, nome: c.nome, telefone: c.telefone, email: c.email||'', obs: c.obs||'', criadoEm: c.data_criacao||c.criadoEm||'' };
}
function normVeiculo(v) {
  return { id: v.id, clienteId: v.cliente_id||v.clienteId, marca: v.marca||'', modelo: v.modelo||'', ano: v.ano||'', placa: v.placa||'', km: v.km||'', criadoEm: v.criadoEm||'' };
}
function normOrdem(o) {
  return {
    id: o.id, numero: o.numero||String(o.id).padStart(4,'0'),
    clienteId: o.cliente_id||o.clienteId, veiculoId: o.veiculo_id||o.veiculoId,
    problema: o.descricao||o.problema||'', servicos: o.servicos||'', pecas: o.pecas||'',
    valorMO: o.valor_mo||o.valorMO||0, valorPecas: o.valor_pecas||o.valorPecas||0,
    status: o.status||'em_andamento', data: o.data||'', observacao: o.observacao||o.obs||'',
    criadoEm: o.criado_em||o.criadoEm||''
  };
}
function normLembrete(l) {
  return { id: l.id, veiculoId: l.veiculo_id||l.veiculoId, tipo: l.tipo||'outro',
    descricao: l.descricao||'', dataPrevisao: l.data_previsao||l.dataPrevisao||'',
    kmPrevisao: l.km_previsao||l.kmPrevisao||'', visto: !!l.visto, criadoEm: l.criado_em||l.criadoEm||'' };
}
function normEstoque(i) {
  return { id: i.id, nome: i.nome, categoria: i.categoria||'peca', tipo: i.tipo||'',
    marca: i.marca||'', aplicacao: i.aplicacao||'', quantidade: i.quantidade||0,
    estoqueMin: i.estoque_min||i.estoqueMin||0, preco: i.preco||0,
    dataCompra: i.data_compra||i.dataCompra||'', obs: i.obs||'' };
}
function normDespesa(d) {
  return { id: d.id, descricao: d.descricao, categoria: d.categoria||'Outros',
    valor: d.valor||0, data: d.data||'', vencimento: d.vencimento||'',
    pago: !!d.pago, obs: d.obs||'' };
}
function normOrcamento(o) {
  return { id: o.id, numero: o.numero||'', clienteId: o.cliente_id||o.clienteId,
    veiculoId: o.veiculo_id||o.veiculoId, descricao: o.descricao||'',
    servicos: o.servicos||'', pecas: o.pecas||'',
    valorMO: o.valor_mo||o.valorMO||0, valorPecas: o.valor_pecas||o.valorPecas||0,
    status: o.status||'pendente', validade: o.validade||'', obs: o.obs||'',
    criadoEm: o.criado_em||o.criadoEm||'' };
}

// ── Converte camelCase (app) → snake_case (API) ───────────────
function toApiCliente(d)   { return { nome: d.nome, telefone: d.telefone||null, email: d.email||null, obs: d.obs||null }; }
function toApiVeiculo(d)   { return { cliente_id: d.clienteId||null, marca: d.marca, modelo: d.modelo, ano: d.ano||null, placa: d.placa||null, km: d.km||null }; }
function toApiOrdem(d)     { return { cliente_id: d.clienteId||null, veiculo_id: d.veiculoId||null, descricao: d.problema||d.descricao||'', servicos: d.servicos||null, pecas: d.pecas||null, valor_mo: d.valorMO||0, valor_pecas: d.valorPecas||0, status: d.status||'em_andamento', data: d.data||null, observacao: d.observacao||null }; }
function toApiLembrete(d)  { return { veiculo_id: d.veiculoId||null, tipo: d.tipo||'outro', descricao: d.descricao, data_previsao: d.dataPrevisao||null, km_previsao: d.kmPrevisao||null, visto: d.visto?1:0 }; }
function toApiEstoque(d)   { return { nome: d.nome, categoria: d.categoria||'peca', tipo: d.tipo||null, marca: d.marca||null, aplicacao: d.aplicacao||null, quantidade: d.quantidade||0, estoque_min: d.estoqueMin||0, preco: d.preco||0, data_compra: d.dataCompra||null, obs: d.obs||null }; }
function toApiDespesa(d)   { return { descricao: d.descricao, categoria: d.categoria||'Outros', valor: d.valor, data: d.data, vencimento: d.vencimento||null, pago: d.pago?1:0, obs: d.obs||null }; }
function toApiOrcamento(d) { return { cliente_id: d.clienteId||null, veiculo_id: d.veiculoId||null, descricao: d.descricao||null, servicos: d.servicos||null, pecas: d.pecas||null, valor_mo: d.valorMO||0, valor_pecas: d.valorPecas||0, status: d.status||'pendente', validade: d.validade||null, obs: d.obs||null }; }

// ── Store genérico com suporte dual ──────────────────────────
function makeStore({ key, apiPath, norm, toApi, localExtra = {} }) {
  return {
    // Retorna lista (síncrono em local, Promise em API)
    all(filter) {
      if (isApiMode()) {
        const cached = cacheGet(key);
        if (cached) return Promise.resolve(cached);
        return apiClient.get(apiPath + (filter||'')).then(rows => {
          const data = rows.map(norm);
          cacheSet(key, data);
          return data;
        });
      }
      return DB.get(key);
    },
    // Busca por id
    get(id) {
      if (isApiMode()) {
        const cached = cacheGet(key);
        if (cached) return Promise.resolve(cached.find(i => i.id === id) || null);
        return this.all().then(list => list.find(i => i.id === id) || null);
      }
      return DB.get(key).find(i => i.id === id);
    },
    // Salva (cria ou atualiza)
    save(data) {
      if (isApiMode()) {
        cacheInvalidate(key);
        const body = toApi(data);
        if (data.id) return apiClient.put(apiPath + '/' + data.id, body).then(() => ({ ...data }));
        return apiClient.post(apiPath, body).then(res => ({ ...data, id: res.id, numero: res.numero }));
      }
      // localStorage
      const list = DB.get(key);
      if (data.id) { list[list.findIndex(i => i.id === data.id)] = data; }
      else { data.id = DB.nextId(key); data.criadoEm = new Date().toISOString(); list.push(data); }
      DB.set(key, list);
      return data;
    },
    // Deleta
    delete(id) {
      if (isApiMode()) {
        cacheInvalidate(key);
        return apiClient.del(apiPath + '/' + id);
      }
      DB.set(key, DB.get(key).filter(i => i.id !== id));
    },
    ...localExtra
  };
}

// ── STORES ───────────────────────────────────────────────────

const Clientes = makeStore({
  key: 'clientes', apiPath: '/app/clientes', norm: normCliente, toApi: toApiCliente,
});

const Veiculos = makeStore({
  key: 'veiculos', apiPath: '/app/veiculos', norm: normVeiculo, toApi: toApiVeiculo,
  localExtra: {
    byCliente(clienteId) {
      if (isApiMode()) return this.all('?cliente_id=' + clienteId);
      return DB.get('veiculos').filter(v => v.clienteId === clienteId);
    }
  }
});

const Ordens = makeStore({
  key: 'ordens', apiPath: '/app/os', norm: normOrdem, toApi: toApiOrdem,
  localExtra: {
    byVeiculo(veiculoId) {
      if (isApiMode()) return this.all().then(list => list.filter(o => o.veiculoId === veiculoId));
      return DB.get('ordens').filter(o => o.veiculoId === veiculoId);
    }
  }
});

const Lembretes = makeStore({
  key: 'lembretes', apiPath: '/app/lembretes', norm: normLembrete, toApi: toApiLembrete,
});

const Orcamentos = makeStore({
  key: 'orcamentos', apiPath: '/app/orcamentos', norm: normOrcamento, toApi: toApiOrcamento,
});

const Despesas = makeStore({
  key: 'despesas', apiPath: '/app/despesas', norm: normDespesa, toApi: toApiDespesa,
  localExtra: {
    allByPeriodo(inicio, fim) {
      if (isApiMode()) {
        cacheInvalidate('despesas');
        return apiClient.get(`/app/despesas?inicio=${inicio}&fim=${fim}`).then(rows => rows.map(normDespesa));
      }
      return DB.get('despesas').filter(d => d.data >= inicio && d.data <= fim);
    }
  }
});

const Estoque = makeStore({
  key: 'estoque', apiPath: '/app/estoque', norm: normEstoque, toApi: toApiEstoque,
  localExtra: {
    byCategoria(cat) {
      if (isApiMode()) return this.all('?categoria=' + cat);
      return DB.get('estoque').filter(i => i.categoria === cat);
    }
  }
});

const Meta = {
  get() { try { return JSON.parse(localStorage.getItem('of_meta')) || { valor: 0 }; } catch { return { valor: 0 }; } },
  set(val) { localStorage.setItem('of_meta', JSON.stringify({ valor: val })); }
};

const Oficina = {
  get() { try { return JSON.parse(localStorage.getItem('of_oficina')) || {}; } catch { return {}; } },
  set(data) { localStorage.setItem('of_oficina', JSON.stringify(data)); }
};

// ── MSG HISTÓRICO (sempre local — não vai pro backend) ────────
const MsgHistorico = {
  all() { try { return JSON.parse(localStorage.getItem('of_msg_hist')) || []; } catch { return []; } },
  add(item) {
    const list = this.all();
    item.id = Date.now();
    list.push(item);
    if (list.length > 100) list.splice(0, list.length - 100);
    localStorage.setItem('of_msg_hist', JSON.stringify(list));
  },
  clear() { localStorage.removeItem('of_msg_hist'); }
};

// ===== SEED DEMO DATA (só modo local) =====
function seedDemoData() {
  if (isApiMode()) return; // API tem dados reais, não precisa de seed

  const SEED_VERSION = '4';
  if (localStorage.getItem('of_seed_v') === SEED_VERSION) return;
  ['clientes','veiculos','ordens','lembretes','orcamentos'].forEach(k => localStorage.removeItem('of_' + k));
  localStorage.setItem('of_seed_v', SEED_VERSION);

  const d = (n) => { const dt = new Date(); dt.setDate(dt.getDate() - n); return dt.toISOString().split('T')[0]; };

  const c1  = Clientes.save({ nome: 'João Silva',       telefone: '(11) 99999-1234', email: 'joao@email.com',     obs: 'Cliente fiel desde 2020' });
  const c2  = Clientes.save({ nome: 'Maria Souza',      telefone: '(11) 98888-5678', email: 'maria@email.com',    obs: '' });
  const c3  = Clientes.save({ nome: 'Carlos Pereira',   telefone: '(11) 97777-9012', email: '',                   obs: 'Prefere ligar antes' });
  const c4  = Clientes.save({ nome: 'Ana Lima',         telefone: '(11) 96666-3344', email: 'ana@email.com',      obs: '' });
  const c5  = Clientes.save({ nome: 'Roberto Dias',     telefone: '(11) 95555-7788', email: '',                   obs: '' });
  const c6  = Clientes.save({ nome: 'Fernanda Costa',   telefone: '(11) 94444-1122', email: 'fernanda@email.com', obs: 'Tem dois carros' });
  const c7  = Clientes.save({ nome: 'Marcos Oliveira',  telefone: '(11) 93333-4455', email: '',                   obs: '' });
  const c8  = Clientes.save({ nome: 'Patrícia Mendes',  telefone: '(11) 92222-6677', email: 'patricia@email.com', obs: 'Paga no cartão' });
  const c9  = Clientes.save({ nome: 'Lucas Ferreira',   telefone: '(11) 91111-8899', email: 'lucas@email.com',    obs: '' });
  const c10 = Clientes.save({ nome: 'Juliana Rocha',    telefone: '(11) 90000-2233', email: '',                   obs: 'Indicação do João' });
  const c11 = Clientes.save({ nome: 'Eduardo Santos',   telefone: '(11) 98765-4321', email: 'edu@email.com',      obs: '' });
  const c12 = Clientes.save({ nome: 'Camila Alves',     telefone: '(11) 97654-3210', email: 'camila@email.com',   obs: 'Frota da empresa' });
  const c13 = Clientes.save({ nome: 'Rafael Nunes',     telefone: '(11) 96543-2109', email: '',                   obs: '' });
  const c14 = Clientes.save({ nome: 'Beatriz Carvalho', telefone: '(11) 95432-1098', email: 'bia@email.com',      obs: '' });
  const c15 = Clientes.save({ nome: 'Thiago Monteiro',  telefone: '(11) 94321-0987', email: 'thiago@email.com',   obs: 'Mecânico amigo' });

  const v1  = Veiculos.save({ marca: 'Chevrolet',  modelo: 'Onix',    ano: '2021', placa: 'ABC-1234', km: '45000', clienteId: c1.id });
  const v2  = Veiculos.save({ marca: 'Volkswagen', modelo: 'Gol',     ano: '2018', placa: 'DEF-5678', km: '82000', clienteId: c2.id });
  const v3  = Veiculos.save({ marca: 'Fiat',       modelo: 'Strada',  ano: '2022', placa: 'GHI-9012', km: '31000', clienteId: c3.id });
  const v4  = Veiculos.save({ marca: 'Toyota',     modelo: 'Corolla', ano: '2020', placa: 'JKL-3456', km: '61000', clienteId: c4.id });
  const v5  = Veiculos.save({ marca: 'Ford',       modelo: 'Ka',      ano: '2019', placa: 'MNO-7890', km: '54000', clienteId: c5.id });
  const v6  = Veiculos.save({ marca: 'Honda',      modelo: 'Civic',   ano: '2022', placa: 'PQR-1357', km: '28000', clienteId: c6.id });
  const v7  = Veiculos.save({ marca: 'Hyundai',    modelo: 'HB20',    ano: '2020', placa: 'STU-2468', km: '47000', clienteId: c6.id });
  const v8  = Veiculos.save({ marca: 'Jeep',       modelo: 'Renegade',ano: '2021', placa: 'VWX-3691', km: '39000', clienteId: c7.id });
  const v9  = Veiculos.save({ marca: 'Renault',    modelo: 'Kwid',    ano: '2023', placa: 'YZA-4802', km: '12000', clienteId: c8.id });
  const v10 = Veiculos.save({ marca: 'Nissan',     modelo: 'Kicks',   ano: '2021', placa: 'BCD-5913', km: '33000', clienteId: c9.id });
  const v11 = Veiculos.save({ marca: 'Fiat',       modelo: 'Pulse',   ano: '2022', placa: 'EFG-6024', km: '22000', clienteId: c10.id });
  const v12 = Veiculos.save({ marca: 'Volkswagen', modelo: 'T-Cross', ano: '2023', placa: 'HIJ-7135', km: '15000', clienteId: c11.id });
  const v13 = Veiculos.save({ marca: 'Chevrolet',  modelo: 'S10',     ano: '2019', placa: 'KLM-8246', km: '95000', clienteId: c12.id });
  const v14 = Veiculos.save({ marca: 'Toyota',     modelo: 'Hilux',   ano: '2020', placa: 'NOP-9357', km: '78000', clienteId: c12.id });
  const v15 = Veiculos.save({ marca: 'Ford',       modelo: 'Ranger',  ano: '2021', placa: 'QRS-0468', km: '52000', clienteId: c13.id });
  const v16 = Veiculos.save({ marca: 'Honda',      modelo: 'HR-V',    ano: '2022', placa: 'TUV-1579', km: '26000', clienteId: c14.id });
  const v17 = Veiculos.save({ marca: 'Hyundai',    modelo: 'Creta',   ano: '2021', placa: 'WXY-2680', km: '41000', clienteId: c15.id });
  const v18 = Veiculos.save({ marca: 'Fiat',       modelo: 'Toro',    ano: '2020', placa: 'ZAB-3791', km: '67000', clienteId: c1.id });
  const v19 = Veiculos.save({ marca: 'Volkswagen', modelo: 'Polo',    ano: '2023', placa: 'CDE-4802', km: '8000',  clienteId: c3.id });
  const v20 = Veiculos.save({ marca: 'Chevrolet',  modelo: 'Tracker', ano: '2022', placa: 'FGH-5913', km: '19000', clienteId: c5.id });

  const os = [
    { c:c1.id,  v:v1.id,  prob:'Revisão completa 45.000 km',       serv:'Troca de óleo, filtros, velas, correia',  pecas:'Óleo 5W30, Filtros, Velas NGK, Correia', mo:'480', p:'620', st:'finalizado',   d:d(0) },
    { c:c2.id,  v:v2.id,  prob:'Suspensão com barulho',            serv:'Troca de amortecedores dianteiros',       pecas:'Amortecedores Monroe par',               mo:'420', p:'680', st:'finalizado',   d:d(0) },
    { c:c6.id,  v:v6.id,  prob:'Revisão 30.000 km',                serv:'Revisão geral + troca de óleo',          pecas:'Óleo 0W20, Filtros, Velas',              mo:'450', p:'480', st:'finalizado',   d:d(1) },
    { c:c12.id, v:v13.id, prob:'Revisão 100.000 km — S10',         serv:'Revisão completa, correia, fluidos',     pecas:'Kit correia, fluidos, filtros',           mo:'780', p:'920', st:'finalizado',   d:d(1) },
    { c:c7.id,  v:v8.id,  prob:'Freios dianteiros gastos',         serv:'Troca de discos e pastilhas',            pecas:'Discos Fremax, Pastilhas Bosch',          mo:'320', p:'560', st:'finalizado',   d:d(2) },
    { c:c9.id,  v:v10.id, prob:'Alinhamento e balanceamento',      serv:'Alinhamento 4 rodas + balanceamento',    pecas:'-',                                       mo:'220', p:'0',   st:'finalizado',   d:d(2) },
    { c:c4.id,  v:v4.id,  prob:'Troca de óleo sintético',          serv:'Troca de óleo 0W20 + filtro',            pecas:'Óleo 0W20 Toyota, Filtro original',       mo:'160', p:'180', st:'finalizado',   d:d(3) },
    { c:c12.id, v:v14.id, prob:'Revisão Hilux 80.000 km',          serv:'Revisão completa diesel',                pecas:'Óleo 5W40, Filtros, Correia',             mo:'820', p:'980', st:'finalizado',   d:d(7) },
    { c:c1.id,  v:v18.id, prob:'Revisão Toro 70.000 km',           serv:'Revisão completa + correia',             pecas:'Kit correia, filtros, fluidos',           mo:'680', p:'740', st:'finalizado',   d:d(9) },
    { c:c5.id,  v:v5.id,  prob:'Correia dentada',                  serv:'Troca de correia dentada + tensor',      pecas:'Kit correia Gates',                       mo:'380', p:'320', st:'finalizado',   d:d(11) },
    { c:c4.id,  v:v4.id,  prob:'Revisão 65.000 km Corolla',        serv:'Revisão completa + troca de óleo',       pecas:'Óleo 0W20, Filtros, Velas',              mo:'520', p:'480', st:'finalizado',   d:d(14) },
    { c:c13.id, v:v15.id, prob:'Revisão Ranger 50.000 km',         serv:'Revisão completa + troca de óleo diesel',pecas:'Óleo 5W40 diesel, Filtros, Velas',        mo:'580', p:'620', st:'finalizado',   d:d(14) },
    { c:c14.id, v:v16.id, prob:'Suspensão traseira',               serv:'Troca de amortecedores traseiros',       pecas:'Amortecedores Monroe traseiros',          mo:'380', p:'620', st:'finalizado',   d:d(16) },
    { c:c6.id,  v:v6.id,  prob:'Limpeza de bicos injetores',       serv:'Limpeza de injetores + diagnóstico',     pecas:'Kit limpeza injetores',                   mo:'320', p:'160', st:'finalizado',   d:d(17) },
    { c:c9.id,  v:v10.id, prob:'Revisão 35.000 km Kicks',          serv:'Revisão completa',                       pecas:'Óleo, filtros, velas',                    mo:'420', p:'380', st:'finalizado',   d:d(18) },
    { c:c5.id,  v:v5.id,  prob:'Embreagem patinando — Ka',         serv:'Troca de kit de embreagem',              pecas:'Kit embreagem LUK',                       mo:'580', p:'680', st:'finalizado',   d:d(19) },
    { c:c5.id,  v:v20.id, prob:'Revisão 20.000 km Tracker',        serv:'Revisão + troca de óleo',                pecas:'Óleo 0W20, Filtros',                      mo:'340', p:'300', st:'finalizado',   d:d(21) },
    { c:c15.id, v:v17.id, prob:'Freios dianteiros Creta',          serv:'Troca de discos e pastilhas',            pecas:'Discos Fremax, Pastilhas Bosch',          mo:'300', p:'480', st:'finalizado',   d:d(22) },
    { c:c13.id, v:v15.id, prob:'Suspensão Ranger',                 serv:'Troca de buchas e barra estabilizadora', pecas:'Kit suspensão Ranger',                    mo:'560', p:'640', st:'finalizado',   d:d(23) },
    { c:c6.id,  v:v7.id,  prob:'Revisão 50.000 km HB20',           serv:'Revisão completa + correia',             pecas:'Kit correia, filtros, velas',             mo:'460', p:'420', st:'finalizado',   d:d(25) },
    { c:c1.id,  v:v1.id,  prob:'Barulho na suspensão dianteira',   serv:'Diagnóstico em andamento',               pecas:'-',                                       mo:'420', p:'350', st:'em_andamento', d:d(0) },
    { c:c12.id, v:v14.id, prob:'Revisão Hilux — troca de correia', serv:'Troca de correia dentada diesel',        pecas:'Kit correia Hilux',                       mo:'780', p:'820', st:'em_andamento', d:d(0) },
    { c:c7.id,  v:v8.id,  prob:'Elétrica — central multimídia',    serv:'Diagnóstico elétrico',                   pecas:'-',                                       mo:'250', p:'0',   st:'em_andamento', d:d(0) },
  ];
  os.forEach(o => Ordens.save({ clienteId:o.c, veiculoId:o.v, problema:o.prob, servicos:o.serv, pecas:o.pecas, valorMO:o.mo, valorPecas:o.p, status:o.st, data:o.d }));

  Lembretes.save({ veiculoId: v1.id,  tipo:'oleo',   descricao:'Próxima troca de óleo — Onix',  dataPrevisao:'2026-06-15', kmPrevisao:'50000' });
  Lembretes.save({ veiculoId: v2.id,  tipo:'revisao',descricao:'Revisão dos 90.000 km — Gol',   dataPrevisao:'2026-04-01', kmPrevisao:'90000' });
  Lembretes.save({ veiculoId: v13.id, tipo:'revisao',descricao:'Revisão 100.000 km — S10',      dataPrevisao:'2026-03-20', kmPrevisao:'100000' });
  Lembretes.save({ veiculoId: v4.id,  tipo:'oleo',   descricao:'Troca de óleo — Corolla',       dataPrevisao:'2026-03-10', kmPrevisao:'70000' });

  Meta.set(40000);
}
