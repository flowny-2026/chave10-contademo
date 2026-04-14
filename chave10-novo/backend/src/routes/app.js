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
    let query = 'SELECT * FROM clientes WHERE oficina_id = ?';
    const params = [oid(req)];
    // q é passado como parâmetro LIKE — sem concatenação
    if (q && typeof q === 'string') { query += ' AND nome LIKE ?'; params.push(`%${q.slice(0, 100)}%`); }
    query += ' ORDER BY nome';
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    log.error('app_get_clientes', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/clientes', validateCliente, (req, res) => {
  try {
    const { nome, telefone } = req.body;
    const result = db.prepare('INSERT INTO clientes (oficina_id, nome, telefone) VALUES (?, ?, ?)').run(oid(req), nome, telefone || null);
    res.status(201).json({ id: result.lastInsertRowid, nome, telefone });
  } catch (err) {
    log.error('app_post_cliente', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/clientes/:id', validateCliente, (req, res) => {
  try {
    const { nome, telefone } = req.body;
    // oficina_id no WHERE garante isolamento — usuário não pode editar cliente de outra oficina
    db.prepare('UPDATE clientes SET nome = COALESCE(?, nome), telefone = COALESCE(?, telefone) WHERE id = ? AND oficina_id = ?')
      .run(nome, telefone || null, req.params.id, oid(req));
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
    const { cliente_id, placa, modelo, ano } = req.body;
    const result = db.prepare('INSERT INTO veiculos (oficina_id, cliente_id, placa, modelo, ano) VALUES (?, ?, ?, ?, ?)')
      .run(oid(req), cliente_id || null, placa || null, modelo, ano || null);
    res.status(201).json({ id: result.lastInsertRowid, placa, modelo, ano });
  } catch (err) {
    log.error('app_post_veiculo', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/veiculos/:id', validateVeiculo, (req, res) => {
  try {
    const { cliente_id, placa, modelo, ano } = req.body;
    db.prepare('UPDATE veiculos SET cliente_id = COALESCE(?, cliente_id), placa = COALESCE(?, placa), modelo = COALESCE(?, modelo), ano = COALESCE(?, ano) WHERE id = ? AND oficina_id = ?')
      .run(cliente_id || null, placa || null, modelo, ano || null, req.params.id, oid(req));
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
    if (status && !statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    let q = `
      SELECT os.*, c.nome as cliente_nome, c.telefone as cliente_telefone,
             v.modelo as veiculo_modelo, v.placa
      FROM ordens_servico os
      LEFT JOIN clientes c ON c.id = os.cliente_id
      LEFT JOIN veiculos v ON v.id = os.veiculo_id
      WHERE os.oficina_id = ?
    `;
    const params = [oid(req)];
    if (status) { q += ' AND os.status = ?'; params.push(status); }
    q += ' ORDER BY os.id DESC';
    res.json(db.prepare(q).all(...params));
  } catch (err) {
    log.error('app_get_os', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/os', validateOS, (req, res) => {
  try {
    const { cliente_id, veiculo_id, descricao, valor, observacao } = req.body;
    const result = db.prepare(`
      INSERT INTO ordens_servico (oficina_id, cliente_id, veiculo_id, descricao, valor, observacao)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(oid(req), cliente_id || null, veiculo_id || null, descricao, valor || 0, observacao || null);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    log.error('app_post_os', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/os/:id', validateOS, (req, res) => {
  try {
    const { descricao, valor, status, observacao, cliente_id, veiculo_id } = req.body;
    const statusValidos = ['em_andamento', 'finalizado'];
    if (status && !statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    db.prepare(`
      UPDATE ordens_servico SET
        descricao = COALESCE(?, descricao), valor = COALESCE(?, valor),
        status = COALESCE(?, status), observacao = COALESCE(?, observacao),
        cliente_id = COALESCE(?, cliente_id), veiculo_id = COALESCE(?, veiculo_id)
      WHERE id = ? AND oficina_id = ?
    `).run(descricao, valor || null, status || null, observacao || null, cliente_id || null, veiculo_id || null, req.params.id, oid(req));
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
