import { describe, expect, it } from "vitest";
import { rankSources, retrievalTerms } from "@/lib/ai";

const date = new Date("2026-07-01T00:00:00.000Z");

describe("AI 引用片段排名", () => {
  it("为中文查询生成完整词与双字词", () => {
    expect(retrievalTerms("宿舍热水时间")).toEqual(expect.arrayContaining(["宿舍热水时间", "宿舍", "热水", "时间"]));
  });

  it("相关度相同时优先官方来源，并截取命中位置附近的片段", () => {
    const filler = "无关段落".repeat(80);
    const ranked = rankSources("宿舍热水", [
      { title: "学生经验", type: "普通问答", content: `${filler}宿舍热水开放安排仅供参考。${filler}`, url: "/questions/community", updatedAt: date },
      { title: "住宿管理手册", type: "学校资料", content: `${filler}宿舍热水开放安排以通知为准。${filler}`, url: "/knowledge/official", updatedAt: date }
    ], 8);
    expect(ranked[0]?.type).toBe("学校资料");
    expect(ranked[0]?.content).toContain("宿舍热水");
    expect(ranked[0]?.matchedTerms).toContain("宿舍热水");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });

  it("剔除完全不相关的候选内容", () => {
    expect(rankSources("食堂充值", [{ title: "社团活动", type: "官方公告", content: "本周举行篮球比赛", url: "/announcements/1", updatedAt: date }], 8)).toEqual([]);
  });
});
