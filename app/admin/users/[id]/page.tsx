import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/user-badge";
import { AdminUserActions } from "@/components/admin-user-actions";

export default async function UserAdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await db.user.findUnique({
    where: { id: (await params).id },
    include: {
      _count: { select: { questions: true, answers: true, comments: true, reports: true, sessions: true } },
      questions: {
        where: { status: "PUBLISHED", deletedAt: null },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50
      },
      answers: {
        where: { status: "PUBLISHED", deletedAt: null },
        select: { id: true, content: true, createdAt: true, question: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 50
      },
      comments: {
        where: { deletedAt: null },
        select: {
          id: true,
          content: true,
          createdAt: true,
          answer: { select: { id: true, question: { select: { id: true, title: true } } } },
          question: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      },
      warningsReceived: {
        include: { issuedBy: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });
  if (!user) notFound();

  return <>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><Link className="text-sm text-brand-700 hover:underline dark:text-brand-300" href="/admin/users">← 返回用户列表</Link><h1 className="mt-2 text-3xl font-bold">用户详情</h1></div>
      <Link className="btn-secondary" href={`/users/${encodeURIComponent(user.username)}`}>查看公开主页</Link>
    </div>
    <section className="card mt-5">
      <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-bold">{user.username}</h2><Badge role={user.role} identity={user.identityBadge} /></div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-slate-500">邮箱</dt><dd className="mt-1 break-all font-medium">{user.email} · {user.emailVerifiedAt ? "已验证" : "未验证"}</dd></div>
        <div><dt className="text-slate-500">账号状态</dt><dd className="mt-1 font-medium">{user.status}{user.banReason && ` · ${user.banReason}`}</dd></div>
        <div><dt className="text-slate-500">注册时间</dt><dd className="mt-1 font-medium">{user.createdAt.toLocaleString("zh-CN")}</dd></div>
        <div><dt className="text-slate-500">最近登录</dt><dd className="mt-1 font-medium">{user.lastLoginAt?.toLocaleString("zh-CN") || "从未"}</dd></div>
        <div><dt className="text-slate-500">内容统计</dt><dd className="mt-1 font-medium">问题 {user._count.questions} · 回答 {user._count.answers} · 评论 {user._count.comments}</dd></div>
        <div><dt className="text-slate-500">有效 Session</dt><dd className="mt-1 font-medium">{user._count.sessions}</dd></div>
      </dl>
      <AdminUserActions id={user.id} role={user.role} identity={user.identityBadge} />
    </section>

    <section className="card mt-5">
      <h2 className="text-lg font-bold">管理员警告记录（{user.warningsReceived.length}）</h2>
      <div className="mt-4 space-y-3">{user.warningsReceived.map((warning) => <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30" key={warning.id}><p className="whitespace-pre-wrap">{warning.reason}</p><p className="mt-2 text-xs text-slate-500">处理人：{warning.issuedBy.username} · {warning.createdAt.toLocaleString("zh-CN")}{warning.reportId ? ` · 举报 ${warning.reportId}` : ""}</p></div>)}{user.warningsReceived.length === 0 && <p className="text-sm text-slate-500">暂无管理员警告。</p>}</div>
    </section>

    <div className="mt-6 grid gap-5 xl:grid-cols-3">
      <ContentList title={`已发布问题（${user.questions.length}）`} empty="暂无已发布问题">
        {user.questions.map((question) => <Link className="block rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:hover:border-brand-700 dark:hover:bg-brand-950/30" href={`/questions/${question.id}`} key={question.id}>
          <span className="line-clamp-2 font-medium">{question.title}</span><time className="mt-1 block text-xs text-slate-500">{question.createdAt.toLocaleString("zh-CN")}</time>
        </Link>)}
      </ContentList>
      <ContentList title={`已发布回答（${user.answers.length}）`} empty="暂无已发布回答">
        {user.answers.map((answer) => <Link className="block rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:hover:border-brand-700 dark:hover:bg-brand-950/30" href={`/questions/${answer.question.id}#answer-${answer.id}`} key={answer.id}>
          <span className="block text-xs text-brand-700 dark:text-brand-300">回答于：{answer.question.title}</span><span className="mt-1 line-clamp-3 text-sm">{answer.content}</span>
        </Link>)}
      </ContentList>
      <ContentList title={`已发布评论（${user.comments.length}）`} empty="暂无已发布评论">
        {user.comments.map((comment) => {
          const question = comment.answer?.question ?? comment.question;
          const href = question ? `/questions/${question.id}${comment.answer ? `#comment-${comment.id}` : ""}` : "#";
          return <Link className="block rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:hover:border-brand-700 dark:hover:bg-brand-950/30" href={href} key={comment.id}>
            <span className="block text-xs text-brand-700 dark:text-brand-300">评论于：{question?.title ?? "原内容不可用"}</span><span className="mt-1 line-clamp-3 text-sm">{comment.content}</span>
          </Link>;
        })}
      </ContentList>
    </div>
  </>;
}

function ContentList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="card"><h2 className="text-lg font-bold">{title}</h2><div className="mt-4 space-y-3">{hasChildren ? children : <p className="py-6 text-center text-sm text-slate-500">{empty}</p>}</div></section>;
}
