const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { SECRET } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validate');
const log = require('../utils/logger');

// Atualiza status de oficinas vencidas (roda a cada login)
function atualizarVencidos() {
  const hoje = new Date().toISOString().split('T')[0];
  const grace = new Date();
  grace.setDate(grace.getDate() - 3);
  const graceStr = grace.toISOString().split('T')[0];

  db.prepare(`
    UPDATE oficinas SET status_assinatura = 'blocked'
    WHERE status_assinatura = 'overdue' AND data_vencimento < ?
  `).run(graceStr);

  db.prepare(`
    UPDATE oficinas SET status_assinatura = 'overdue'
    WHERE status_assinatura IN ('active','pending') AND data_vencimento < ?
  `).run(hoje);
}

// POST /api/auth/login
router.post('/login', validateLogin, (req, res) => {
  const { email, senha } = req.body;
  const ip = req.ip;

  atualizarVencidos();

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1').get(email);

  // Compara hash mesmo se usuário não existir (evita timing attack)
  const hashFake = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
  const hashAlvo = usuario?.senha_hash || hashFake;
  const senhaOk  = bcrypt.compareSync(senha, hashAlvo);

  if (!usuario || !senhaOk) {
    log.loginFail({ email, ip });
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // master_admin: acesso livre
  if (usuario.perfil === 'master_admin') {
    db.prepare("UPDATE usuarios SET ultimo_acesso = datetime('now') WHERE id = ?").run(usuario.id);
    const token = jwt.sign(
      { id: usuario.id, perfil: 'master_admin', nome: usuario.nome },
      SECRET,
      { expiresIn: '8h' }
    );
    log.loginOk({ email, perfil: 'master_admin', ip });
    return res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: 'master_admin', oficina_id: null },
    });
  }

  // Usuário de oficina: verificar assinatura
  const oficina = db.prepare('SELECT * FROM oficinas WHERE id = ?').get(usuario.oficina_id);
  if (!oficina) {
    log.loginFail({ email, motivo: 'oficina não encontrada', ip });
    return res.status(403).json({ error: 'Oficina não encontrada' });
  }

  if (oficina.status_assinatura === 'blocked') {
    log.loginFail({ email, motivo: 'oficina bloqueada', ip });
    return res.status(403).json({ error: 'blocked' });
  }
  if (oficina.status_assinatura === 'overdue') {
    log.loginFail({ email, motivo: 'oficina em atraso', ip });
    return res.status(403).json({ error: 'overdue' });
  }

  db.prepare("UPDATE usuarios SET ultimo_acesso = datetime('now') WHERE id = ?").run(usuario.id);
  const token = jwt.sign(
    { id: usuario.id, perfil: usuario.perfil, oficina_id: usuario.oficina_id, nome: usuario.nome },
    SECRET,
    { expiresIn: '8h' }
  );

  log.loginOk({ email, perfil: usuario.perfil, oficina_id: usuario.oficina_id, ip });
  res.json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      oficina_id: usuario.oficina_id,
    },
  });
});

module.exports = router;
