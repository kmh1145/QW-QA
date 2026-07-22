import type { IdentityBadge, Role } from "@prisma/client";
export function isAdmin(user: { role: Role }) { return user.role === "ADMIN"; }
export function canMarkOfficial(user: { role: Role; identityBadge: IdentityBadge }) { return user.role === "ADMIN" || user.identityBadge === "TEACHER"; }
export function canManageContent(user: { id: string; role: Role }, authorId: string) { return user.role === "ADMIN" || user.id === authorId; }
export function canSelfSelectIdentity(identity: IdentityBadge) { return identity !== "TEACHER"; }
export function promoteIdentity(identity: IdentityBadge): IdentityBadge {
  if (identity === "GRADE_1") return "GRADE_2";
  if (identity === "GRADE_2") return "GRADE_3";
  if (identity === "GRADE_3") return "ALUMNI";
  return identity;
}
export function canSetBestAnswer(user: { id: string; role: Role }, questionAuthorId: string) { return user.role === "ADMIN" || user.id === questionAuthorId; }
export function isWithinDailyLimit(currentCount: number, limit: number) { return currentCount < limit; }
