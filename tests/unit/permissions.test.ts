import { describe, expect, it } from "vitest";
import { canManageContent, canMarkOfficial, canSelfSelectIdentity, canSetBestAnswer, isAdmin, isWithinDailyLimit, promoteIdentity } from "@/lib/permissions";

describe("权限与身份", () => {
  it("普通用户不是管理员", () => expect(isAdmin({ role: "USER" })).toBe(false));
  it("教师或管理员可设官方答案", () => {
    expect(canMarkOfficial({ role: "USER", identityBadge: "TEACHER" })).toBe(true);
    expect(canMarkOfficial({ role: "ADMIN", identityBadge: "NONE" })).toBe(true);
    expect(canMarkOfficial({ role: "USER", identityBadge: "GRADE_1" })).toBe(false);
  });
  it("教师标识不能自选", () => expect(canSelfSelectIdentity("TEACHER")).toBe(false));
  it("按学年升级且毕业生教师不变", () => {
    expect(promoteIdentity("GRADE_1")).toBe("GRADE_2");
    expect(promoteIdentity("GRADE_2")).toBe("GRADE_3");
    expect(promoteIdentity("GRADE_3")).toBe("ALUMNI");
    expect(promoteIdentity("ALUMNI")).toBe("ALUMNI");
    expect(promoteIdentity("TEACHER")).toBe("TEACHER");
  });
  it("只有作者或管理员可以管理内容", () => {
    expect(canManageContent({ id: "author", role: "USER" }, "author")).toBe(true);
    expect(canManageContent({ id: "other", role: "USER" }, "author")).toBe(false);
    expect(canManageContent({ id: "admin", role: "ADMIN" }, "author")).toBe(true);
  });
  it("只有题主或管理员可设最佳答案", () => {
    expect(canSetBestAnswer({ id: "u1", role: "USER" }, "u1")).toBe(true);
    expect(canSetBestAnswer({ id: "u2", role: "USER" }, "u1")).toBe(false);
    expect(canSetBestAnswer({ id: "u2", role: "ADMIN" }, "u1")).toBe(true);
  });
  it("AI 每日限额边界正确", () => {
    expect(isWithinDailyLimit(29, 30)).toBe(true);
    expect(isWithinDailyLimit(30, 30)).toBe(false);
  });
});
