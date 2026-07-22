import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge, identityLabel } from "@/components/user-badge";
import { UserAvatar } from "@/components/user-avatar";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> { return { title: `${decodeURIComponent((await params).username)} 的主页` }; }
export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const user = await db.user.findUnique({ where: { username: decodeURIComponent((await params).username) }, include: { _count: { select: { questions: true, answers: true } }, questions: { where: { status: "PUBLISHED", deletedAt: null }, orderBy: { createdAt: "desc" }, take: 10 } } });
  if (!user || user.deletedAt) notFound();
  return <main className="container-page max-w-3xl py-10"><section className="card"><div className="flex items-center gap-4"><UserAvatar username={user.username} avatarUrl={user.avatarUrl} size="lg" /><div><h1 className="text-2xl font-bold">{user.username}</h1><Badge role={user.role} identity={user.identityBadge} /></div></div><p className="mt-5">{user.bio || "这个用户还没有填写个人简介。"}</p><div className="mt-5 flex gap-5 text-sm"><span>{user._count.questions} 个提问</span><span>{user._count.answers} 个回答</span></div>{user.identityBadge !== "TEACHER" && user.identityBadge !== "NONE" && <p className="mt-4 text-xs text-slate-500">{identityLabel(user.identityBadge)}由用户自行选择，不代表学校官方认证。</p>}{(user.role === "ADMIN" || user.identityBadge === "TEACHER") && <p className="mt-4 text-xs text-slate-500">管理员和学校教师标识由后台授予。</p>}</section><h2 className="mb-3 mt-8 text-xl font-bold">最近提问</h2>{user.questions.map((question) => <Link className="card mb-3 block" href={`/questions/${question.id}`} key={question.id}>{question.title}</Link>)}</main>;
}
