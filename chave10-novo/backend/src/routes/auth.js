const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { query, queryOne, run } = require('../db');
const { SECRET } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validate');
const log = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function atualizarVencidos() {
  const hoje = new Date().toISOString().split('T')[0];
  const grace = new Date(); grace.setDate(grace.getDate()-3);
  const graceStr = grace.toISOString().split('T')[0];
  await run("UPDATE oficinas SET status_assinatura='blocked' WHERE status_assinatura='overdue' AND data_vencimento < $1", [graceStr]);
  await run("UPDATE oficinas SET status_assinatura='overdue' WHERE status_assinatura IN ('active','pending') AND data_vencimento < $1", [hoje]);
}

router.post('/login', validateLogin, async (req, res) => {
  const { email, senha } = req.body;
  const ip = req.ip;
  try {
    await atualizarVencidos();
    const usuario = await queryOne('SELECT * FROM usuarios WHERE email=$1 AND ativo=1', [email]);
    const hashFake = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    const hashAlvo = usuario?.senha_hash || hashFake;
    const senhaOk  = bcrypt.compareSync(senha, hashAlvo);
    if (!usuario || !senhaOk) { log.loginFail({email,ip}); return res.status(401).json({error:'Credenciais inválidas'}); }

    if (usuario.perfil === 'master_admin') {
      await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
      const token = jwt.sign({id:usuario.id,perfil:'master_admin',nome:usuario.nome}, SECRET, {expiresIn:'8h'});
      log.loginOk({email,perfil:'master_admin',ip});
      return res.json({token, usuario:{id:usuario.id,nome:usuario.nome,email:usuario.email,perfil:'master_admin',oficina_id:null}});
    }

    const oficina = await queryOne('SELECT * FROM oficinas WHERE id=$1', [usuario.oficina_id]);
    if (!oficina) { log.loginFail({email,motivo:'oficina não encontrada',ip}); return res.status(403).json({error:'Oficina não encontrada'}); }
    if (oficina.status_assinatura==='blocked') { log.loginFail({email,motivo:'bloqueada',ip}); return res.status(403).json({error:'blocked'}); }
    if (oficina.status_assinatura==='overdue')  { log.loginFail({email,motivo:'overdue',ip});   return res.status(403).json({error:'overdue'}); }

    await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
    const token = jwt.sign({id:usuario.id,perfil:usuario.perfil,oficina_id:usuario.oficina_id,nome:usuario.nome}, SECRET, {expiresIn:'8h'});
    log.loginOk({email,perfil:usuario.perfil,oficina_id:usuario.oficina_id,ip});
    res.json({
      token,
      usuario:{
        id:usuario.id,
        nome:usuario.nome,
        email:usuario.email,
        perfil:usuario.perfil,
        oficina_id:usuario.oficina_id,
        data_vencimento: oficina.data_vencimento,
        status_assinatura: oficina.status_assinatura,
      }
    });
  } catch(err) { log.error('auth_login',err); res.status(500).json({error:'Erro interno'}); }
});

// LOGIN COM GOOGLE
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Token Google não fornecido' });
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google OAuth não configurado no servidor' });

  try {
    await atualizarVencidos();

    // Verifica o token com o Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name: nome, sub: google_id } = payload;

    // Busca usuário pelo email
    const usuario = await queryOne('SELECT * FROM usuarios WHERE email=$1 AND ativo=1', [email]);

    if (!usuario) {
      log.loginFail({ email, motivo: 'email Google não cadastrado', ip: req.ip });
      return res.status(403).json({ error: 'Nenhuma conta encontrada com este e-mail Google. Solicite acesso ao administrador.' });
    }

    if (usuario.perfil === 'master_admin') {
      await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
      const token = jwt.sign({ id: usuario.id, perfil: 'master_admin', nome: usuario.nome }, SECRET, { expiresIn: '8h' });
      log.loginOk({ email, perfil: 'master_admin', ip: req.ip });
      return res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: 'master_admin', oficina_id: null } });
    }

    const oficina = await queryOne('SELECT * FROM oficinas WHERE id=$1', [usuario.oficina_id]);
    if (!oficina) return res.status(403).json({ error: 'Oficina não encontrada' });
    if (oficina.status_assinatura === 'blocked') return res.status(403).json({ error: 'blocked' });
    if (oficina.status_assinatura === 'overdue')  return res.status(403).json({ error: 'overdue' });

    await run('UPDATE usuarios SET ultimo_acesso=$1 WHERE id=$2', [new Date().toISOString(), usuario.id]);
    const token = jwt.sign({ id: usuario.id, perfil: usuario.perfil, oficina_id: usuario.oficina_id, nome: usuario.nome }, SECRET, { expiresIn: '8h' });
    log.loginOk({ email, perfil: usuario.perfil, oficina_id: usuario.oficina_id, ip: req.ip });
    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        oficina_id: usuario.oficina_id,
        data_vencimento: oficina.data_vencimento,
        status_assinatura: oficina.status_assinatura,
      },
    });
  } catch (err) {
    log.error('auth_google', err);
    if (err.message?.includes('Token used too late') || err.message?.includes('Invalid token')) {
      return res.status(401).json({ error: 'Token Google inválido ou expirado' });
    }
    res.status(500).json({ error: 'Erro ao autenticar com Google' });
  }
});

module.exports = router;
