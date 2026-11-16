import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env.js";
import { exigirLogin } from "./auth.js";
import { ErroHttp } from "./util.js";
import { conta } from "./routes/conta.js";
import { projetos } from "./routes/projetos.js";
import { board } from "./routes/board.js";

const app = express();
app.disable("x-powered-by");
// No Render há um proxy na frente: sem isso o limite de login veria o IP do proxy
if (env.producao) app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        // style inline: cores dos post-its e das colunas vão no atributo style
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "frame-ancestors": ["'none'"],
        "form-action": ["'self'"],
        "upgrade-insecure-requests": env.producao ? [] : null,
      },
    },
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", conta);
app.use("/api", exigirLogin, projetos, board);
app.use("/api", (_req, res) => res.status(404).json({ erro: "Rota não existe" }));

// Em produção o Express também serve o build do front (um serviço só)
const dist = path.join(env.raiz, "frontend", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => (req.method === "GET" ? res.sendFile(path.join(dist, "index.html")) : next()));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ErroHttp) return res.status(err.status).json({ erro: err.message });
  if (err instanceof SyntaxError) return res.status(400).json({ erro: "JSON inválido" });
  console.error(err);
  res.status(500).json({ erro: "Erro interno" });
});

app.listen(env.port, "0.0.0.0", () => console.log(`API em http://localhost:${env.port}`));
