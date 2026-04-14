const jwt = require('jsonwebtoken');
const log = require('../utils/logger');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('❌ FATAL: JWT_SECRET não definido. Configure o arquivo .env');
  process.exit(1);
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    log.security('acesso_negado', { motivo: 'token ausente', path: req.path, ip: req.ip });
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    log.security('acesso_negado', { motivo: 'token inválido', path: req.path, ip: req.ip });
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Apenas master_admin
function masterAdminOnly(req, res, next) {
  if (req.user?.perfil !== 'master_admin') {
    log.security('acesso_negado', {
      motivo: 'perfil insuficiente',
      perfil: req.user?.perfil,
      path: req.path,
      ip: req.ip,
    });
    return res.status(403).json({ error: 'Acesso restrito ao administrador' });
  }
  next();
}

// master_admin OU usuário com oficina associada
// master_admin NÃO acessa /app — área exclusiva de usuários de oficina
function oficinaSelf(req, res, next) {
  if (!req.user?.oficina_id) {
    log.security('acesso_negado', {
      motivo: 'sem oficina associada (perfil: ' + req.user?.perfil + ')',
      ip: req.ip,
      path: req.path,
    });
    return res.status(403).json({ error: 'Acesso restrito a usuários de oficina' });
  }
  next();
}

module.exports = { authMiddleware, masterAdminOnly, oficinaSelf, SECRET };
