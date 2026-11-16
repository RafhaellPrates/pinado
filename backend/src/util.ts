import type { NextFunction, Request, Response } from "express";
import type { ReqAuth } from "./auth.js";

export class ErroHttp extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

// Repassa erro de handler async pro middleware de erro do Express
export const h =
  (fn: (req: ReqAuth, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
    fn(req as ReqAuth, res).catch(next);

export function texto(v: unknown, campo: string, max = 200): string {
  if (typeof v !== "string" || !v.trim()) throw new ErroHttp(400, `${campo} é obrigatório`);
  if (v.length > max) throw new ErroHttp(400, `${campo} passa de ${max} caracteres`);
  return v.trim();
}

export function textoOpcional(v: unknown, campo: string, max = 5000): string {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") throw new ErroHttp(400, `${campo} inválido`);
  if (v.length > max) throw new ErroHttp(400, `${campo} passa de ${max} caracteres`);
  return v;
}

export function cor(v: unknown): string {
  if (typeof v !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v)) throw new ErroHttp(400, "Cor inválida");
  return v.toLowerCase();
}

export function prioridade(v: unknown): number {
  const n = Number(v);
  if (![1, 2, 3, 4].includes(n)) throw new ErroHttp(400, "Prioridade inválida");
  return n;
}

export const CUSTO_BCRYPT = 12;

// bcrypt ignora o que passa de 72 bytes, então o limite fica explícito
export function senhaNova(v: unknown): string {
  const s = typeof v === "string" ? v : "";
  if (s.length < 8) throw new ErroHttp(400, "A senha precisa de 8 caracteres ou mais");
  if (Buffer.byteLength(s) > 72) throw new ErroHttp(400, "A senha passa de 72 caracteres");
  return s;
}

export function id(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ErroHttp(400, "Id inválido");
  return n;
}

export function naoEncontrado(): never {
  throw new ErroHttp(404, "Não encontrado");
}
