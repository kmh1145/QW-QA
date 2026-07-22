import { describe, expect, it } from "vitest";
import payload from "@/data/imports/qa-spreadsheet.json";

const allowedCategories = new Set([
  "enrollment",
  "dormitory",
  "canteen-card",
  "rules",
  "courses",
  "subject-selection",
  "clubs",
  "facilities",
  "study-experience",
  "other"
]);

describe("历史问答表格迁移数据", () => {
  it("包含预期数量的问题和回答", () => {
    const answers = payload.questions.flatMap((question) => question.answers);
    expect(payload.questions).toHaveLength(216);
    expect(answers).toHaveLength(570);
  });

  it("来源行唯一且字段符合数据库限制", () => {
    const sourceRows = payload.questions.map((question) => `${question.source.sheet}:${question.source.row}`);
    expect(new Set(sourceRows).size).toBe(sourceRows.length);
    for (const question of payload.questions) {
      expect(question.title.trim().length).toBeGreaterThan(0);
      expect(question.title.length).toBeLessThanOrEqual(150);
      expect(allowedCategories.has(question.categorySlug)).toBe(true);
      for (const answer of question.answers) expect(answer.content.trim().length).toBeGreaterThan(0);
    }
  });

  it("不保留已识别的真实姓名", () => {
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("林安琪");
    expect(serialized).not.toContain("谌睿");
  });
});
