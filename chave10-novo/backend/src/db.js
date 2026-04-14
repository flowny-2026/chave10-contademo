const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, '../chave10.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS oficinas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    responsavel TEXT,
    telefone TEXT,
    email TEXT UNIQUE NOT NULL,
    plano TEXT DEFAULT 'mensal',
    status_assinatura TEXT DEFAULT 'pending'
      CHECK(status_assinatura IN ('active','pending','overdue','blocked')),
    data_vencimento TEXT,
    data_criacao TEXT DEFAULT (date('now')),
    observacoes TEXT
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oficina_id INTEGER REFERENCES oficinas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    perfil TEXT DEFAULT 'funcionario'
      CHECK(perfil IN ('master_admin','admin_oficina','funcionario')),
    ativo INTEGER DEFAULT 1,
    ultimo_acesso TEXT
  );

  CREATE TABLE IF NOT EXISTS pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    valor REAL NOT NULL,
    data_pagamento TEXT NOT NULL,
    novo_vencimento TEXT NOT NULL,
    forma_pagamento TEXT DEFAULT 'pix'
      CHECK(forma_pagamento IN ('pix','dinheiro','transferencia')),
    observacao TEXT,
    confirmado_por TEXT
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    telefone TEXT,
    data_criacao TEXT DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS veiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    placa TEXT,
    modelo TEXT,
    ano TEXT
  );

  CREATE TABLE IF NOT EXISTS ordens_servico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    servicos TEXT,
    pecas TEXT,
    valor_mo REAL DEFAULT 0,
    valor_pecas REAL DEFAULT 0,
    valor REAL DEFAULT 0,
    status TEXT DEFAULT 'em_andamento'
      CHECK(status IN ('em_andamento','finalizado')),
    data TEXT DEFAULT (date('now')),
    observacao TEXT,
    numero TEXT
  );

  CREATE TABLE IF NOT EXISTS lembretes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE CASCADE,
    tipo TEXT DEFAULT 'outro',
    descricao TEXT NOT NULL,
    data_previsao TEXT,
    km_previsao TEXT,
    visto INTEGER DEFAULT 0,
    criado_em TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS estoque (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria TEXT DEFAULT 'peca',
    tipo TEXT,
    marca TEXT,
    aplicacao TEXT,
    quantidade INTEGER DEFAULT 0,
    estoque_min INTEGER DEFAULT 0,
    preco REAL DEFAULT 0,
    data_compra TEXT,
    obs TEXT,
    criado_em TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS despesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    categoria TEXT DEFAULT 'Outros',
    valor REAL NOT NULL,
    data TEXT NOT NULL,
    vencimento TEXT,
    pago INTEGER DEFAULT 0,
    obs TEXT,
    criado_em TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orcamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
    numero TEXT,
    descricao TEXT,
    servicos TEXT,
    pecas TEXT,
    valor_mo REAL DEFAULT 0,
    valor_pecas REAL DEFAULT 0,
    status TEXT DEFAULT 'pendente',
    validade TEXT,
    obs TEXT,
    criado_em TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agenda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    oficina_id INTEGER NOT NULL REFERENCES oficinas(id) ON DELETE CASCADE,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    data TEXT NOT NULL,
    hora TEXT,
    descricao TEXT,
    criado_em TEXT DEFAULT (datetime('now'))
  );
`);

// Migração: perfis antigos → novos
try {
  db.exec("UPDATE usuarios SET perfil = 'master_admin' WHERE perfil = 'admin'");
} catch {}

// Migrações de colunas
const migrações = [
  "ALTER TABLE clientes ADD COLUMN email TEXT",
  "ALTER TABLE clientes ADD COLUMN obs TEXT",
  "ALTER TABLE veiculos ADD COLUMN marca TEXT",
  "ALTER TABLE veiculos ADD COLUMN km TEXT",
  "ALTER TABLE orcamentos ADD COLUMN desconto REAL DEFAULT 0",
];
migrações.forEach(sql => { try { db.exec(sql); } catch {} });

// Criar master_admin padrão se não existir
const adminExists = db.prepare("SELECT id FROM usuarios WHERE perfil = 'master_admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO usuarios (oficina_id, nome, email, senha_hash, perfil)
    VALUES (NULL, 'Administrador', 'admin@chave10.com', ?, 'master_admin')
  `).run(hash);
  console.log('✅ master_admin criado: admin@chave10.com / admin123');
}

module.exports = db;
