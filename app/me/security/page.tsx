import { requireUser, getCurrentSessionTokenHash } from "@/lib/auth";
import { db } from "@/lib/db";
import { MeNav } from "@/components/me-nav";
import { SecuritySettings } from "@/components/security-settings";

export default async function SecurityPage() {
  const user = await requireUser({ verified: false });
  const [sessions, currentTokenHash] = await Promise.all([
    db.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    getCurrentSessionTokenHash()
  ]);
  const rows = sessions.map((session) => ({ id: session.id, userAgent: session.userAgent?.slice(0, 140) || "未知设备", ipAddress: session.ipAddress || "未知 IP", lastSeenAt: session.lastSeenAt.toISOString(), current: session.tokenHash === currentTokenHash })).sort((left, right) => Number(right.current) - Number(left.current));
  return <main className="container-page max-w-4xl py-10"><MeNav /><h1 className="mb-5 text-3xl font-bold">安全设置</h1><SecuritySettings sessions={rows} /></main>;
}
