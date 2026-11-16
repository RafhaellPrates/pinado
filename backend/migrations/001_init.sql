CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  tema JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE grupos (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  posicao INT NOT NULL DEFAULT 0
);

CREATE TABLE projetos (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grupo_id INT NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  arquivado BOOLEAN NOT NULL DEFAULT false,
  posicao INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE colunas (
  id SERIAL PRIMARY KEY,
  projeto_id INT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'done')),
  cor TEXT NOT NULL,
  posicao INT NOT NULL
);

CREATE TABLE cards (
  id SERIAL PRIMARY KEY,
  projeto_id INT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  coluna_id INT NOT NULL REFERENCES colunas(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  cor TEXT NOT NULL DEFAULT '#fde68a',
  prioridade SMALLINT NOT NULL DEFAULT 3 CHECK (prioridade BETWEEN 1 AND 4),
  -- chave de fractional indexing; COLLATE "C" garante ordem byte a byte
  posicao TEXT COLLATE "C" NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON grupos (user_id);
CREATE INDEX ON projetos (user_id, grupo_id);
CREATE INDEX ON colunas (projeto_id);
CREATE INDEX ON cards (coluna_id, posicao);
