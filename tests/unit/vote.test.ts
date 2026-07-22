import { describe, expect, it } from "vitest";
describe("点赞唯一性",()=>{it("Prisma 模型使用用户与内容组合主键",async()=>{const schema=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../../prisma/schema.prisma",import.meta.url),"utf8"));expect(schema).toContain("@@id([userId, questionId])");expect(schema).toContain("@@id([userId, answerId])")})});
