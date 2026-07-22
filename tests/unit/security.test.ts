import { describe, expect, it } from "vitest"; import { createToken, hashToken } from "@/lib/security";
describe("一次性 Token 基础",()=>{it("生成不可预测原值且仅保存哈希",()=>{const a=createToken();const b=createToken();expect(a.raw).not.toBe(b.raw);expect(a.raw.length).toBeGreaterThan(30);expect(a.hash).toBe(hashToken(a.raw));expect(a.hash).not.toContain(a.raw)})});
