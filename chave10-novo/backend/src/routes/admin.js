const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db');
const { authMiddleware, masterAdminOnly } = require('../middleware/auth');
const { validateOficina, validateUsuario, validatePagamento } = require('../middleware/validate');
const log = require('../utils/logger');

// Todas as rotas admin exigem token válido + perfil master_admin
router.use(authMiddleware, masterAdminOnly);

// ─── DASHBOARD ───────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  try {
    const hoje     = new Date().toISOString().split('T')[0];
    const mesInicio = hoje.substring(0, 7) + '-01';

    const stats = {
      totalOficinas: db.prepare("SELECT COUNT(*) as n FROM oficinas").get().n,
      ativas:        db.prepare("SELECT COUNT(*) as n FROM oficinas WHERE status_assinatura = 'active'").get().n,
      overdue:       db.prepare("SELECT COUNT(*) as n FROM oficinas WHERE status_assinatura = 'overdue'").get().n,
      blocked:       db.prepare("SELECT COUNT(*) as n FROM oficinas WHERE status_assinatura = 'blocked'").get().n,
      receitaMes:    db.prepare("SELECT COALESCE(SUM(valor),0) as n FROM pagamentos WHERE data_pagamento >= ?").get(mesInicio).n,
      receitaTotal:  db.prepare("SELECT COALESCE(SUM(valor),0) as n FROM pagamentos").get().n,
      vencendo:      db.prepare("SELECT COUNT(*) as n FROM oficinas WHERE data_vencimento BETWEEN ? AND date(?, '+7 days')").get(hoje, hoje).n,
    };

    const receitaMensal = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const inicio = `${ano}-${mes}-01`;
      const fim    = `${ano}-${mes}-31`;
      const row = db.prepare("SELECT COALESCE(SUM(valor),0) as total FROM pagamentos WHERE data_pagamento >= ? AND data_pagamento <= ?").get(inicio, fim);
      receitaMensal.push({ mes: `${mes}/${String(ano).slice(2)}`, total: row.total });
    }

    const recentes = db.prepare(`
      SELECT p.*, o.nome as nome_oficina
      FROM pagamentos p JOIN oficinas o ON o.id = p.oficina_id
      ORDER BY p.data_pagamento DESC LIMIT 10
    `).all();

    res.json({ stats, receitaMensal, recentes });
  } catch (err) {
    log.error('admin_dashboard', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── OFICINAS ────────────────────────────────────────────────
router.get('/oficinas', (req, res) => {
  try {
    const { status } = req.query;
    const statusValidos = ['active', 'pending', 'overdue', 'blocked'];
    // Parâmetro de status validado — nunca concatenado diretamente
    if (status && !statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    let q = 'SELECT * FROM oficinas';
    const p = [];
    if (status) { q += ' WHERE status_assinatura = ?'; p.push(status); }
    q += ' ORDER BY nome';
    res.json(db.prepare(q).all(...p));
  } catch (err) {
    log.error('admin_get_oficinas', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/oficinas', validateOficina, (req, res) => {
  try {
    const { nome, responsavel, telefone, email, plano, data_vencimento, observacoes } = req.body;
    const result = db.prepare(`
      INSERT INTO oficinas (nome, responsavel, telefone, email, plano, data_vencimento, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nome, responsavel || null, telefone || null, email, plano || 'mensal', data_vencimento || null, observacoes || null);
    log.info('oficina_criada', { id: result.lastInsertRowid, nome, por: req.user.email || req.user.id });
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Email já cadastrado' });
    log.error('admin_post_oficina', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.put('/oficinas/:id', validateOficina, (req, res) => {
  try {
    const { nome, responsavel, telefone, email, plano, status_assinatura, data_vencimento, observacoes } = req.body;
    const statusValidos = ['active', 'pending', 'overdue', 'blocked'];
    if (status_assinatura && !statusValidos.includes(status_assinatura)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    db.prepare(`
      UPDATE oficinas SET
        nome = COALESCE(?, nome), responsavel = COALESCE(?, responsavel),
        telefone = COALESCE(?, telefone), email = COALESCE(?, email),
        plano = COALESCE(?, plano), status_assinatura = COALESCE(?, status_assinatura),
        data_vencimento = COALESCE(?, data_vencimento), observacoes = COALESCE(?, observacoes)
      WHERE id = ?
    `).run(nome, responsavel || null, telefone || null, email, plano || null, status_assinatura || null, data_vencimento || null, observacoes || null, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Email já cadastrado' });
    log.error('admin_put_oficina', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.patch('/oficinas/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validos = ['active', 'pending', 'overdue', 'blocked'];
    if (!validos.includes(status)) return res.status(400).json({ error: 'Status inválido' });
    db.prepare('UPDATE oficinas SET status_assinatura = ? WHERE id = ?').run(status, req.params.id);
    log.info('status_assinatura_alterado', { oficina_id: req.params.id, novo_status: status, por: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    log.error('admin_patch_status', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.delete('/oficinas/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM oficinas WHERE id = ?').run(req.params.id);
    log.info('oficina_removida', { oficina_id: req.params.id, por: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    log.error('admin_delete_oficina', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/oficinas/:id/usuarios', (req, res) => {
  try {
    // Nunca retorna senha_hash
    res.json(db.prepare('SELECT id, nome, email, perfil, ativo, ultimo_acesso FROM usuarios WHERE oficina_id = ?').all(req.params.id));
  } catch (err) {
    log.error('admin_get_usuarios', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── USUÁRIOS ────────────────────────────────────────────────
router.post('/usuarios', validateUsuario, (req, res) => {
  try {
    const { oficina_id, nome, email, senha, perfil } = req.body;
    // master_admin não pode ser criado via API (apenas via seed)
    if (perfil === 'master_admin') {
      return res.status(403).json({ error: 'Não é permitido criar master_admin via API' });
    }
    const hash = bcrypt.hashSync(senha, 12);
    const result = db.prepare(`
      INSERT INTO usuarios (oficina_id, nome, email, senha_hash, perfil)
      VALUES (?, ?, ?, ?, ?)
    `).run(oficina_id || null, nome, email, hash, perfil || 'admin_oficina');
    log.info('usuario_criado', { id: result.lastInsertRowid, email, perfil, por: req.user.id });
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Email já cadastrado' });
    log.error('admin_post_usuario', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── PAGAMENTOS ──────────────────────────────────────────────
router.post('/pagamentos', validatePagamento, (req, res) => {
  try {
    const { oficina_id, valor, data_pagamento, novo_vencimento, forma_pagamento, observacao } = req.body;
    if (!oficina_id) return res.status(400).json({ error: 'oficina_id é obrigatório' });

    db.prepare(`
      INSERT INTO pagamentos (oficina_id, valor, data_pagamento, novo_vencimento, forma_pagamento, observacao, confirmado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      oficina_id, valor,
      data_pagamento || new Date().toISOString().split('T')[0],
      novo_vencimento,
      forma_pagamento || 'pix',
      observacao || null,
      String(req.user.id)
    );

    db.prepare("UPDATE oficinas SET status_assinatura = 'active', data_vencimento = ? WHERE id = ?").run(novo_vencimento, oficina_id);
    log.info('pagamento_registrado', { oficina_id, valor, novo_vencimento, por: req.user.id });
    res.status(201).json({ ok: true });
  } catch (err) {
    log.error('admin_post_pagamento', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/pagamentos', (req, res) => {
  try {
    const { oficina_id } = req.query;
    // oficina_id é passado como parâmetro — nunca concatenado
    let q = `SELECT p.*, o.nome as nome_oficina FROM pagamentos p JOIN oficinas o ON o.id = p.oficina_id`;
    const params = [];
    if (oficina_id) { q += ' WHERE p.oficina_id = ?'; params.push(Number(oficina_id)); }
    q += ' ORDER BY p.data_pagamento DESC';
    res.json(db.prepare(q).all(...params));
  } catch (err) {
    log.error('admin_get_pagamentos', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── DETALHES DA OFICINA ─────────────────────────────────────
router.get('/oficinas/:id/detalhes', (req, res) => {
  try {
    const id = req.params.id;
    const oficina = db.prepare('SELECT * FROM oficinas WHERE id = ?').get(id);
    if (!oficina) return res.status(404).json({ error: 'Oficina não encontrada' });

    const usuarios = db.prepare('SELECT id, nome, email, perfil, ativo, ultimo_acesso FROM usuarios WHERE oficina_id = ?').all(id);
    const pagamentos = db.prepare('SELECT * FROM pagamentos WHERE oficina_id = ? ORDER BY data_pagamento DESC LIMIT 10').all(id);

    const uso = {
      clientes:  db.prepare('SELECT COUNT(*) as n FROM clientes WHERE oficina_id = ?').get(id).n,
      veiculos:  db.prepare('SELECT COUNT(*) as n FROM veiculos WHERE oficina_id = ?').get(id).n,
      os:        db.prepare('SELECT COUNT(*) as n FROM ordens_servico WHERE oficina_id = ?').get(id).n,
      osMes:     db.prepare("SELECT COUNT(*) as n FROM ordens_servico WHERE oficina_id = ? AND data >= date('now','start of month')").get(id).n,
      faturamento: db.prepare("SELECT COALESCE(SUM(valor),0) as n FROM ordens_servico WHERE oficina_id = ? AND status = 'finalizado'").get(id).n,
    };

    res.json({ oficina, usuarios, pagamentos, uso });
  } catch (err) {
    log.error('admin_get_detalhes', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ─── VENCENDO EM 7 DIAS ──────────────────────────────────────
router.get('/vencendo', (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const em7  = new Date(); em7.setDate(em7.getDate() + 7);
    const em7str = em7.toISOString().split('T')[0];
    const rows = db.prepare(`
      SELECT * FROM oficinas
      WHERE data_vencimento BETWEEN ? AND ?
      AND status_assinatura IN ('active','overdue')
      ORDER BY data_vencimento ASC
    `).all(hoje, em7str);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── RENOVAÇÃO EM LOTE ───────────────────────────────────────
router.post('/renovar-lote', (req, res) => {
  try {
    const { ids, novo_vencimento, valor, forma_pagamento } = req.body;
    if (!ids?.length || !novo_vencimento) return res.status(400).json({ error: 'ids e novo_vencimento são obrigatórios' });

    const hoje = new Date().toISOString().split('T')[0];
    ids.forEach(id => {
      db.prepare("UPDATE oficinas SET status_assinatura = 'active', data_vencimento = ? WHERE id = ?").run(novo_vencimento, id);
      if (valor && parseFloat(valor) > 0) {
        db.prepare('INSERT INTO pagamentos (oficina_id, valor, data_pagamento, novo_vencimento, forma_pagamento, confirmado_por) VALUES (?,?,?,?,?,?)').run(
          id, parseFloat(valor), hoje, novo_vencimento, forma_pagamento || 'pix', String(req.user.id)
        );
      }
    });
    log.info('renovacao_lote', { ids, novo_vencimento, por: req.user.id });
    res.json({ ok: true, renovadas: ids.length });
  } catch (err) {
    log.error('admin_renovar_lote', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
