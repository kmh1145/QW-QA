import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MeNav } from "@/components/me-nav";
import { ActionButton } from "@/components/action-button";
import { NotificationList } from "@/components/notification-list";

export default async function NotificationsPage() {
  const user = await requireUser({ verified: false });
  const rows = await db.notification.findMany({ where: { userId: user.id, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 100 });
  return <main className="container-page py-10">
    <MeNav />
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">消息通知</h1><ActionButton endpoint="/api/notifications/read-all" label="全部标为已读" /></div>
    <NotificationList initialRows={rows.map((row) => ({ id: row.id, title: row.title, content: row.content, link: row.link, read: Boolean(row.readAt), createdAt: row.createdAt.toISOString() }))} />
  </main>;
}
