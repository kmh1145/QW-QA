import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const suite = process.env.TEST_DATABASE_URL ? describe : describe.skip;
let db: PrismaClient;

suite("动态分类", () => {
  beforeAll(() => {
    db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  });
  afterAll(() => db.$disconnect());

  it("管理员后台所需的新增、停用和删除空分类数据操作可用", async () => {
    const suffix = Date.now().toString();
    const category = await db.category.create({ data: { name: `测试分类${suffix}`, slug: `test-category-${suffix}`, sortOrder: 999 } });
    const disabled = await db.category.update({ where: { id: category.id }, data: { isActive: false, description: "已停用测试分类" } });
    expect(disabled.isActive).toBe(false);
    await db.category.delete({ where: { id: category.id } });
    expect(await db.category.findUnique({ where: { id: category.id } })).toBeNull();
  });
});
