import { hash, verify } from "@node-rs/argon2";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const hashPassword = (password: string) => hash(password, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password);
export function createToken() { const raw = randomBytes(32).toString("base64url"); return { raw, hash: hashToken(raw) }; }
export function hashToken(raw: string) { return createHash("sha256").update(raw).digest("hex"); }
export function safeEqual(a: string, b: string) { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export function addMinutes(minutes: number) { return new Date(Date.now() + minutes * 60_000); }
