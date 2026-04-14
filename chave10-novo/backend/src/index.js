// Carrega variáveis de ambiente antes de tudo
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ── HELMET: headers de segurança HTTP ────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────
// Em produção, defina FRONTEND_URL com o domínio real (ex: https://app.chave10.com.br)
// Nunca use '*' em produção para uma API autenticada
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin(origin, cb) {
    // Permite requisições sem origin (ex: Postman, mobile) apenas em dev
    if (!origin && process.env.NODE_ENV !== 'production') return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origem não permitida'));
  },
  credentials: true,
}));

// ── BODY PARSER ───────────────────────────────────────────────
app.use(express.json({ limit: '50kb' })); // limita tamanho do payload

// ── RATE LIMIT: proteção contra brute force no login ─────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,                   // máx 20 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

// ── ROTAS ─────────────────────────────────────────────────────
app.use('/api/auth',  loginLimiter, require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/app',   require('./routes/app'));

// ── HEALTH CHECK ──────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true }));

// ── HANDLER DE ERROS GLOBAL ───────────────────────────────────
// Nunca expõe stack trace para o cliente
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const log = require('./utils/logger');

  // Payload muito grande (body-parser)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload muito grande. Limite: 50kb.' });
  }
  // Erro de CORS
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: 'Origem não permitida' });
  }

  log.error('unhandled_error', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// ── START ─────────────────────────────────────────────────────
// Em produção, rode atrás de um proxy reverso (nginx/caddy) com HTTPS
// O Express não precisa gerenciar TLS diretamente nesse setup
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Chave 10 backend rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`));
