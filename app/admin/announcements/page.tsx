import { db } from "@/lib/db";
import { AnnouncementManager } from "@/components/announcement-manager";

export default async function AnnouncementsAdminPage() {
  const rows = await db.announcement.findMany({ where: { deletedAt: null }, include: { author: { select: { username: true } } }, orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }] });
  return <><h1 className="text-3xl font-bold">公告管理</h1><p className="mt-2 text-sm text-slate-500">创建、编辑、置顶或停止公开校园公告；正文支持 Markdown。</p><AnnouncementManager rows={rows.map((row) => ({ id: row.id, title: row.title, summary: row.summary, content: row.content, isPinned: row.isPinned, isPublic: row.isPublic, publishedAt: row.publishedAt.toISOString(), authorName: row.author.username }))} /></>;
}
