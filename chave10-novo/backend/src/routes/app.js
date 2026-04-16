const router = require('express').Router();
const db     = require('../db');
const { authMiddleware, oficinaSelf } = require('../middleware/auth');
const { validateCliente, validateVeiculo, validateOS } = require('../middleware/validate');
const log = require('../utils/logger');

// Todas as rotas exigem token válido + oficina associada
router.use(authMiddleware, oficinaSelf);

// Helper: oficina_id do token — NUNCA do body/query (isolamento garantido)
const oid = (req) => req.user.oficina_id;

// ─── DASHBOARD ───────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  try {
    const id = oid(req);
    const hoje      = new Date().toISOString().split('T')[0];
    const mesInicio = hoje.substring(0, 7) + '-01';

    const stats = {
      emAndamento:     db.prepare("SELECT COUNT(*) as n FROM ordens_servico WHERE oficina_id = ? AND status = 'em_andamento'").get(id).n,
      finalizadasHoje: db.prepare("SELECT COUNT(*) as n FROM ordens_servico WHERE oficina_id = ? AND status = 'finalizado' AND data = ?").get(id, hoje).n,
      faturamentoMes:  db.prepare("SELECT COALESCE(SUM(valor),0) as n FROM ordens_servico WHERE oficina_id = ? AND status = 'finalizado' AND data >= ?").get(id, mesInicio).n,
      totalClientes:   db.prepare("SELECT COUNT(*) as n FROM clientes WHERE oficina_id = ?").get(id).n,
    };

    const recentes = db.prepare(`
      SELECT os.*, c.nome as cliente_nome, v.modelo as veiculo_modelo, v.placa
      FROM ordens_servico os
      LEFT JOIN clientes c ON c.id = os.cliente_id
      LEFT JOIN veiculos v ON v.id = os.veiculo_id
      WHERE os.oficina_id = ? ORDER BY os.id DESC LIMIT 5
    `).all(id);

    const faturamentoMensal = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const inicio = `${ano}-${mes}-01`;
      const fim    = `${ano}-${mes}-31`;
      const row = db.prepare("SELECT COALESCE(SUM(valor),0) as total FROM ordens_servico WHERE oficina_id = ? AND status = 'finalizado' AND data >= ? AND data <= ?").get(id, inicio, fim);
      faturamentoMensal.push({ mes: `${mes}/${String(ano).slice(2)}`, total: row.total });
    }

    res.json({ stats, recentes, faturamentoMensal });
  } catch (err) {
    log.error('app_dashboard', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── CLIENTES ────────────────────────────────────────────────
router.get('/clientes', (req, res) => {
  try {
    const { q } = req.query;
    let query = `
      SELECT c.*, COUNT(v.id) as total_veiculos
      FROM clientes c
      LEFT JOIN veiculos v ON v.cliente_id = c.id
      WHERE c.oficina_id = ?`;
    const params = [oid(req)];
    if (q && typeof q === 'string') { query += ' AND (c.nome LIKE ? OR c.telefone LIKE ?)'; params.push(`%${q.slice(0,100)}%`, `%${q.slice(0,100)}%`); }
    query += ' GROUP BY c.id ORDER BY c.nome';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    log.error('app_get_clientes', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/clientes', validateCliente, (req, res) => {
  try {
    const { nome, telefone, email, obs, endereco } = req.body;
    const result = db.prepare('INSERT INTO clientes (oficina_id, nome, telefone, email, obs, endereco) VALUES (?, ?, ?, ?, ?, ?)').run(oid(req), nome, telefone||null, email||null, obs||null, endereco||null);
    res.status(201).json({ id: result.lastInsertRowid, nome, telefone, email, obs, endereco });
  } catch (err) {
    log.error('app_post_cliente', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/clientes/:id', validateCliente, (req, res) => {
  try {
    const { nome, telefone, email, obs, endereco } = req.body;
    db.prepare('UPDATE clientes SET nome=COALESCE(?,nome), telefone=COALESCE(?,telefone), email=COALESCE(?,email), obs=COALESCE(?,obs), endereco=COALESCE(?,endereco) WHERE id=? AND oficina_id=?')
      .run(nome, telefone||null, email||null, obs||null, endereco||null, req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) {
    log.error('app_put_cliente', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/clientes/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM clientes WHERE id = ? AND oficina_id = ?').run(req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) {
    log.error('app_delete_cliente', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── VEÍCULOS ────────────────────────────────────────────────
router.get('/veiculos', (req, res) => {
  try {
    const { cliente_id } = req.query;
    let q = `
      SELECT v.*, c.nome as cliente_nome FROM veiculos v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.oficina_id = ?
    `;
    const params = [oid(req)];
    if (cliente_id) { q += ' AND v.cliente_id = ?'; params.push(Number(cliente_id)); }
    q += ' ORDER BY v.modelo';
    res.json(db.prepare(q).all(...params));
  } catch (err) {
    log.error('app_get_veiculos', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/veiculos', validateVeiculo, (req, res) => {
  try {
    const { cliente_id, placa, modelo, marca, ano, km } = req.body;
    const result = db.prepare('INSERT INTO veiculos (oficina_id, cliente_id, placa, modelo, marca, ano, km) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(oid(req), cliente_id||null, placa||null, modelo, marca||null, ano||null, km||null);
    res.status(201).json({ id: result.lastInsertRowid, placa, modelo, marca, ano, km });
  } catch (err) {
    log.error('app_post_veiculo', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/veiculos/:id', validateVeiculo, (req, res) => {
  try {
    const { cliente_id, placa, modelo, marca, ano, km } = req.body;
    db.prepare('UPDATE veiculos SET cliente_id=COALESCE(?,cliente_id), placa=COALESCE(?,placa), modelo=COALESCE(?,modelo), marca=COALESCE(?,marca), ano=COALESCE(?,ano), km=COALESCE(?,km) WHERE id=? AND oficina_id=?')
      .run(cliente_id||null, placa||null, modelo, marca||null, ano||null, km||null, req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) {
    log.error('app_put_veiculo', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/veiculos/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM veiculos WHERE id = ? AND oficina_id = ?').run(req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) {
    log.error('app_delete_veiculo', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── ORDENS DE SERVIÇO ───────────────────────────────────────
router.get('/os', (req, res) => {
  try {
    const { status } = req.query;
    const statusValidos = ['em_andamento', 'finalizado'];
    if (status && !statusValidos.includes(status)) return res.status(400).json({ error: 'Status inválido' });
    let q = `SELECT os.*, c.nome as cliente_nome, c.telefone as cliente_telefone, c.endereco as cliente_endereco, v.modelo as veiculo_modelo, v.placa, v.marca as veiculo_marca, v.ano as veiculo_ano, v.km as veiculo_km FROM ordens_servico os LEFT JOIN clientes c ON c.id = os.cliente_id LEFT JOIN veiculos v ON v.id = os.veiculo_id WHERE os.oficina_id = ?`;
    const params = [oid(req)];
    if (status) { q += ' AND os.status = ?'; params.push(status); }
    q += ' ORDER BY os.id DESC';
    const rows = db.prepare(q).all(...params).map(row => ({
      ...row,
      pecas_itens: row.pecas_itens ? (() => { try { return JSON.parse(row.pecas_itens); } catch { return []; } })() : [],
    }));
    res.json(rows);
  } catch (err) {
    log.error('app_get_os', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/os', validateOS, (req, res) => {
  try {
    const { cliente_id, veiculo_id, descricao, servicos, pecas, pecas_itens, valor_mo, valor_pecas, observacao, data } = req.body;
    const valor = (parseFloat(valor_mo)||0) + (parseFloat(valor_pecas)||0);
    const id = oid(req);
    const count = db.prepare("SELECT COUNT(*) as n FROM ordens_servico WHERE oficina_id = ?").get(id).n;
    const numero = String(count + 1).padStart(4, '0');
    const result = db.prepare(`INSERT INTO ordens_servico (oficina_id, cliente_id, veiculo_id, descricao, servicos, pecas, pecas_itens, valor_mo, valor_pecas, valor, observacao, data, numero) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, cliente_id||null, veiculo_id||null, descricao, servicos||null, pecas||null, pecas_itens?JSON.stringify(pecas_itens):null, valor_mo||0, valor_pecas||0, valor, observacao||null, data||new Date().toISOString().split('T')[0], numero);
    res.status(201).json({ id: result.lastInsertRowid, numero });
  } catch (err) {
    log.error('app_post_os', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/os/:id', (req, res) => {
  try {
    const { descricao, servicos, pecas, pecas_itens, valor_mo, valor_pecas, status, observacao, cliente_id, veiculo_id, data } = req.body;
    const statusValidos = ['em_andamento', 'finalizado'];
    if (status && !statusValidos.includes(status)) return res.status(400).json({ error: 'Status inválido' });
    const valor = (parseFloat(valor_mo)||0) + (parseFloat(valor_pecas)||0);
    db.prepare(`UPDATE ordens_servico SET descricao=COALESCE(?,descricao), servicos=COALESCE(?,servicos), pecas=COALESCE(?,pecas), pecas_itens=COALESCE(?,pecas_itens), valor_mo=COALESCE(?,valor_mo), valor_pecas=COALESCE(?,valor_pecas), valor=?, status=COALESCE(?,status), observacao=COALESCE(?,observacao), cliente_id=COALESCE(?,cliente_id), veiculo_id=COALESCE(?,veiculo_id), data=COALESCE(?,data) WHERE id=? AND oficina_id=?`)
      .run(descricao,servicos||null,pecas||null,pecas_itens?JSON.stringify(pecas_itens):null,valor_mo||null,valor_pecas||null,valor,status||null,observacao||null,cliente_id||null,veiculo_id||null,data||null,req.params.id,oid(req));
    res.json({ ok: true });
  } catch (err) {
    log.error('app_put_os', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/os/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!['em_andamento', 'finalizado'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    db.prepare('UPDATE ordens_servico SET status = ? WHERE id = ? AND oficina_id = ?').run(status, req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) {
    log.error('app_patch_os_status', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/os/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM ordens_servico WHERE id = ? AND oficina_id = ?').run(req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) {
    log.error('app_delete_os', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;

// ─── LEMBRETES ───────────────────────────────────────────────
router.get('/lembretes', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT l.*, v.modelo as veiculo_modelo, v.placa, c.nome as cliente_nome
      FROM lembretes l
      LEFT JOIN veiculos v ON v.id = l.veiculo_id
      LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE l.oficina_id = ? ORDER BY l.data_previsao ASC
    `).all(oid(req));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/lembretes', (req, res) => {
  try {
    const { veiculo_id, tipo, descricao, data_previsao, km_previsao } = req.body;
    if (!descricao) return res.status(400).json({ error: 'Descrição obrigatória' });
    const r = db.prepare('INSERT INTO lembretes (oficina_id,veiculo_id,tipo,descricao,data_previsao,km_previsao) VALUES (?,?,?,?,?,?)')
      .run(oid(req), veiculo_id||null, tipo||'outro', descricao, data_previsao||null, km_previsao||null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.put('/lembretes/:id', (req, res) => {
  try {
    const { veiculo_id, tipo, descricao, data_previsao, km_previsao, visto } = req.body;
    db.prepare('UPDATE lembretes SET veiculo_id=COALESCE(?,veiculo_id),tipo=COALESCE(?,tipo),descricao=COALESCE(?,descricao),data_previsao=COALESCE(?,data_previsao),km_previsao=COALESCE(?,km_previsao),visto=COALESCE(?,visto) WHERE id=? AND oficina_id=?')
      .run(veiculo_id||null,tipo||null,descricao||null,data_previsao||null,km_previsao||null,visto!=null?visto:null,req.params.id,oid(req));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.delete('/lembretes/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM lembretes WHERE id=? AND oficina_id=?').run(req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

// ─── ESTOQUE ─────────────────────────────────────────────────
router.get('/estoque', (req, res) => {
  try {
    const { categoria } = req.query;
    let q = 'SELECT * FROM estoque WHERE oficina_id=?';
    const p = [oid(req)];
    if (categoria) { q += ' AND categoria=?'; p.push(categoria); }
    q += ' ORDER BY nome';
    res.json(db.prepare(q).all(...p));
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/estoque', (req, res) => {
  try {
    const { nome, categoria, tipo, marca, aplicacao, quantidade, estoque_min, preco, data_compra, obs, codigo_barras } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
    const r = db.prepare('INSERT INTO estoque (oficina_id,nome,categoria,tipo,marca,aplicacao,quantidade,estoque_min,preco,data_compra,obs,codigo_barras) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(oid(req),nome,categoria||'peca',tipo||null,marca||null,aplicacao||null,quantidade||0,estoque_min||0,preco||0,data_compra||null,obs||null,codigo_barras||null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.put('/estoque/:id', (req, res) => {
  try {
    const { nome, categoria, tipo, marca, aplicacao, quantidade, estoque_min, preco, data_compra, obs, codigo_barras } = req.body;
    db.prepare('UPDATE estoque SET nome=COALESCE(?,nome),categoria=COALESCE(?,categoria),tipo=COALESCE(?,tipo),marca=COALESCE(?,marca),aplicacao=COALESCE(?,aplicacao),quantidade=COALESCE(?,quantidade),estoque_min=COALESCE(?,estoque_min),preco=COALESCE(?,preco),data_compra=COALESCE(?,data_compra),obs=COALESCE(?,obs),codigo_barras=COALESCE(?,codigo_barras) WHERE id=? AND oficina_id=?')
      .run(nome||null,categoria||null,tipo||null,marca||null,aplicacao||null,quantidade!=null?quantidade:null,estoque_min!=null?estoque_min:null,preco!=null?preco:null,data_compra||null,obs||null,codigo_barras||null,req.params.id,oid(req));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.delete('/estoque/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM estoque WHERE id=? AND oficina_id=?').run(req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

// ─── DESPESAS ────────────────────────────────────────────────
router.get('/despesas', (req, res) => {
  try {
    const { inicio, fim } = req.query;
    let q = 'SELECT * FROM despesas WHERE oficina_id=?';
    const p = [oid(req)];
    if (inicio) { q += ' AND data>=?'; p.push(inicio); }
    if (fim)    { q += ' AND data<=?'; p.push(fim); }
    q += ' ORDER BY data DESC';
    res.json(db.prepare(q).all(...p));
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/despesas', (req, res) => {
  try {
    const { descricao, categoria, valor, data, vencimento, pago, obs } = req.body;
    if (!descricao || !valor || !data) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    const r = db.prepare('INSERT INTO despesas (oficina_id,descricao,categoria,valor,data,vencimento,pago,obs) VALUES (?,?,?,?,?,?,?,?)')
      .run(oid(req),descricao,categoria||'Outros',valor,data,vencimento||null,pago?1:0,obs||null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.put('/despesas/:id', (req, res) => {
  try {
    const { descricao, categoria, valor, data, vencimento, pago, obs } = req.body;
    db.prepare('UPDATE despesas SET descricao=COALESCE(?,descricao),categoria=COALESCE(?,categoria),valor=COALESCE(?,valor),data=COALESCE(?,data),vencimento=COALESCE(?,vencimento),pago=COALESCE(?,pago),obs=COALESCE(?,obs) WHERE id=? AND oficina_id=?')
      .run(descricao||null,categoria||null,valor||null,data||null,vencimento||null,pago!=null?pago:null,obs||null,req.params.id,oid(req));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.delete('/despesas/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM despesas WHERE id=? AND oficina_id=?').run(req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

// ─── ORÇAMENTOS ──────────────────────────────────────────────
router.get('/orcamentos', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT o.*, c.nome as cliente_nome, v.modelo as veiculo_modelo, v.placa
      FROM orcamentos o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN veiculos v ON v.id = o.veiculo_id
      WHERE o.oficina_id=? ORDER BY o.id DESC
    `).all(oid(req));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/orcamentos', (req, res) => {
  try {
    const { cliente_id, veiculo_id, descricao, servicos, pecas, valor_mo, valor_pecas, status, validade, obs } = req.body;
    const id = oid(req);
    const count = db.prepare("SELECT COUNT(*) as n FROM orcamentos WHERE oficina_id=?").get(id).n;
    const numero = 'ORC-' + String(count + 1).padStart(4, '0');
    const r = db.prepare('INSERT INTO orcamentos (oficina_id,cliente_id,veiculo_id,numero,descricao,servicos,pecas,valor_mo,valor_pecas,status,validade,obs) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id,cliente_id||null,veiculo_id||null,numero,descricao||null,servicos||null,pecas||null,valor_mo||0,valor_pecas||0,status||'pendente',validade||null,obs||null);
    res.status(201).json({ id: r.lastInsertRowid, numero });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.put('/orcamentos/:id', (req, res) => {
  try {
    const { descricao, servicos, pecas, valor_mo, valor_pecas, status, validade, obs, cliente_id, veiculo_id } = req.body;
    db.prepare('UPDATE orcamentos SET descricao=COALESCE(?,descricao),servicos=COALESCE(?,servicos),pecas=COALESCE(?,pecas),valor_mo=COALESCE(?,valor_mo),valor_pecas=COALESCE(?,valor_pecas),status=COALESCE(?,status),validade=COALESCE(?,validade),obs=COALESCE(?,obs),cliente_id=COALESCE(?,cliente_id),veiculo_id=COALESCE(?,veiculo_id) WHERE id=? AND oficina_id=?')
      .run(descricao||null,servicos||null,pecas||null,valor_mo||null,valor_pecas||null,status||null,validade||null,obs||null,cliente_id||null,veiculo_id||null,req.params.id,oid(req));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.delete('/orcamentos/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM orcamentos WHERE id=? AND oficina_id=?').run(req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.patch('/orcamentos/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validos = ['pendente','aprovado','rejeitado'];
    if (!validos.includes(status)) return res.status(400).json({ error: 'Status inválido' });
    db.prepare('UPDATE orcamentos SET status=? WHERE id=? AND oficina_id=?').run(status, req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

// ─── AGENDA ──────────────────────────────────────────────────
router.get('/agenda', (req, res) => {
  try {
    const { data } = req.query;
    let q = `SELECT a.*, c.nome as cliente_nome, v.modelo as veiculo_modelo FROM agenda a LEFT JOIN clientes c ON c.id=a.cliente_id LEFT JOIN veiculos v ON v.id=a.veiculo_id WHERE a.oficina_id=?`;
    const p = [oid(req)];
    if (data) { q += ' AND a.data=?'; p.push(data); }
    q += ' ORDER BY a.data, a.hora';
    res.json(db.prepare(q).all(...p));
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.post('/agenda', (req, res) => {
  try {
    const { cliente_id, veiculo_id, titulo, data, hora, descricao } = req.body;
    if (!titulo || !data) return res.status(400).json({ error: 'Título e data obrigatórios' });
    const r = db.prepare('INSERT INTO agenda (oficina_id,cliente_id,veiculo_id,titulo,data,hora,descricao) VALUES (?,?,?,?,?,?,?)')
      .run(oid(req),cliente_id||null,veiculo_id||null,titulo,data,hora||null,descricao||null);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

router.delete('/agenda/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM agenda WHERE id=? AND oficina_id=?').run(req.params.id, oid(req));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Erro interno' }); }
});

module.exports = router;
