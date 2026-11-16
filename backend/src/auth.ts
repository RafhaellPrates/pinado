import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env.js";
import { query } from "./db.js";

export interface ReqAuth extends Request {
  userId: number;
}

// v = token_versao do usuário no momento do login
export function gerarToken(userId: number, versao: number) {
  return jwt.sign({ sub: String(userId), v: versao }, env.jwtSecret, { algorithm: "HS256", expiresIn: "30d" });
}

function negar(res: Response) {
  res.status(401).json({ erro: "Sessão expirada, entre de novo" });
}

export async function exigirLogin(req: Request, res: Response, next: NextFunction) {
  const cab = req.headers.authorization ?? "";
  const token = cab.startsWith("Bearer ") ? cab.slice(7) : "";
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
  } catch {
    return negar(res);
  }
  try {
    // Confere se o usuário ainda existe e se o token não foi revogado por troca de senha
    const [u] = await query("SELECT token_versao FROM users WHERE id = $1", [Number(payload.sub)]);
    if (!u || u.token_versao !== payload.v) return negar(res);
    (req as ReqAuth).userId = Number(payload.sub);
    next();
  } catch (e) {
    next(e);
  }
}
