-- Versão do token: trocar a senha incrementa e invalida os tokens emitidos antes
ALTER TABLE users ADD COLUMN token_versao INT NOT NULL DEFAULT 0;
