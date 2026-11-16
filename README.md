# Pinado

Quadro de post-its pessoal no estilo Jira. Projetos separados por grupo (Pessoal, Borgno), cada projeto com board A fazer / Fazendo / Feito, post-its coloridos com prioridade e tema do app editável.

## Stack

- Frontend: React + TypeScript (Vite), dnd-kit pro drag and drop
- Backend: Express + TypeScript, `pg`, bcrypt + JWT
- Banco: Postgres (local via Docker; em produção, Supabase só como host)
- Ordem dos post-its: fractional indexing (chave em texto entre os vizinhos, mesma ideia do LexoRank do Jira). Mover um card grava uma linha só.

## Rodar local

Precisa do Docker Desktop aberto.

```bash
npm install
cp .env.example .env        # troque o JWT_SECRET
npm run db:up               # Postgres na porta 5433
npm run migrate
npm run criar-usuario       # cria usuário (ou redefine senha se o email já existe)
npm run dev                 # API na 3001 + front na 5173
```

Abra http://localhost:5173.

### Acessar de outro aparelho na mesma rede

O Vite sobe com `host: true`. No outro aparelho, abra `http://<IP deste PC>:5173` (o IP aparece no terminal como "Network"). Na primeira vez o Windows pede pra liberar o Node no firewall: libere em rede privada.

## Segurança

- Senhas com bcrypt (custo 12), mínimo de 8 caracteres
- Login limitado a 10 tentativas erradas por IP a cada 15 minutos, com tempo de resposta igual pra email existente ou não
- JWT com algoritmo fixo (HS256) e versão por usuário: trocar a senha encerra as sessões nos outros aparelhos
- Toda rota confere se o projeto, coluna ou card é do usuário logado
- Headers de segurança com helmet, incluindo CSP sem script inline
- Postgres local exposto só em `127.0.0.1`

## Licença

[PolyForm Noncommercial 1.0.0](LICENSE.md). Você pode ler, estudar, modificar e usar o código pra fins pessoais e não comerciais. Vender, revender ou usar comercialmente não é permitido sem autorização do autor.

## Produção

`npm run build` gera o front em `frontend/dist` e compila a API. `npm start` sobe um serviço só: o Express serve o front e a API em `/api`. Variáveis: `DATABASE_URL`, `JWT_SECRET`, `PORT`.
