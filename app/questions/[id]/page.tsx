import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { Markdown } from "@/lib/markdown";
import { Badge } from "@/components/user-badge";
import { AnswerForm } from "@/components/answer-form";
import { getCurrentUser } from "@/lib/auth";
import { ActionButton } from "@/components/action-button";
import { ShareButton } from "@/components/share-button";
import { CommentThread, type CommentView } from "@/components/comments/comment-thread";
import { ReportButton } from "@/components/report-button";
import { ContentActions } from "@/components/content-actions";
import { isEmailVerificationEnabled } from "@/lib/settings";

export const dynamic = "force-dynamic";

const commentInclude = {
  author: { select: { id: true, username: true, role: true, identityBadge: true } },
  replies: {
    include: { author: { select: { id: true, username: true, role: true, identityBadge: true } } },
    orderBy: { createdAt: "asc" as const }
  }
};

async function getQuestion(id: string) {
  return db.question.findUnique({
    where: { id },
    include: {
      author: true,
      category: true,
      tags: { include: { tag: true } },
      answers: {
        where: { status: "PUBLISHED", deletedAt: null },
        include: {
          author: true,
          comments: { where: { parentId: null }, include: commentInclude, orderBy: { createdAt: "asc" } },
          _count: { select: { votes: true, comments: true } }
        },
        orderBy: [{ isOfficial: "desc" }, { createdAt: "asc" }]
      },
      _count: { select: { answers: true, votes: true, favorites: true } }
    }
  });
}

type RawCommentView = Omit<CommentView, "replies"> & { replies: Array<Omit<CommentView, "replies">> };
function normalizeComments(comments: RawCommentView[]): CommentView[] {
  return comments.map((comment) => ({ ...comment, replies: comment.replies.map((reply) => ({ ...reply, replies: [] })) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const question = await getQuestion((await params).id);
  return question ? {
    title: question.title,
    description: question.content.slice(0, 150),
    alternates: { canonical: `/questions/${question.id}` },
    openGraph: { title: question.title, description: question.content.slice(0, 150), type: "article" }
  } : { title: "问题不存在" };
}

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const question = await getQuestion(id);
  if (!question || question.deletedAt || question.status === "HIDDEN") notFound();
  if (question.status === "MERGED" && question.mergedIntoId) redirect(`/questions/${question.mergedIntoId}`);
  await db.question.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  const [user, categories, emailVerificationEnabled] = await Promise.all([
    getCurrentUser(),
    db.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    isEmailVerificationEnabled()
  ]);
  const viewer = user ? { id: user.id, role: user.role } : null;
  const verified = Boolean(user && user.status === "ACTIVE" && (user.emailVerifiedAt || !emailVerificationEnabled));

  return <main className="container-page py-6 sm:py-10">
    <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
      <Link href="/questions" className="hover:text-brand-600">问题</Link><span>/</span>
      <Link href={`/categories/${question.category.slug}`} className="hover:text-brand-600">{question.category.name}</Link>
    </div>
    <article className="card !p-5 sm:!p-7">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{question.category.name}</span>
        {question.isSolved && <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-medium text-emerald-900">已解决</span>}
        {question.isLocked && <span className="rounded-lg bg-red-100 px-2.5 py-1 font-medium text-red-900">已锁定</span>}
        {question.tags.map(({ tag }) => <span key={tag.id} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700">#{tag.name}</span>)}
      </div>
      <h1 className="mt-4 break-words text-2xl font-bold leading-tight sm:text-3xl">{question.title}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link className="font-medium text-slate-700 hover:text-brand-600 dark:text-slate-200" href={`/users/${question.author.username}`}>{question.author.username}</Link>
        <Badge role={question.author.role} identity={question.author.identityBadge} />
        <span>{question.createdAt.toLocaleString("zh-CN")}</span>
        {question.updatedAt.getTime() - question.createdAt.getTime() > 1000 && <span>· 已编辑</span>}
      </div>
      {user && <div className="mt-3"><ContentActions kind="question" id={question.id} title={question.title} content={question.content} categoryId={question.categoryId} categories={categories} canEdit={user.id === question.authorId || user.role === "ADMIN"} isAdmin={user.role === "ADMIN"} isPinned={question.isPinned} isLocked={question.isLocked} /></div>}
      <div className="mt-7"><Markdown>{question.content}</Markdown></div>
      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
        <ActionButton endpoint={`/api/questions/${question.id}/vote`} label={`点赞 ${question._count.votes}`} />
        <ActionButton endpoint={`/api/questions/${question.id}/favorite`} label={`收藏 ${question._count.favorites}`} />
        <ShareButton />
        {user && <ReportButton targetType="Question" targetId={question.id} />}
      </div>
    </article>

    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between"><div><h2 className="text-2xl font-bold">回答</h2><p className="mt-1 text-sm text-slate-500">共 {question.answers.length} 个回答</p></div></div>
      <div className="space-y-5">
        {question.answers.map((answer) => <article id={`answer-${answer.id}`} key={answer.id} className={`card !p-5 sm:!p-7 ${question.acceptedAnswerId === answer.id ? "border-emerald-500 ring-1 ring-emerald-500/20" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="font-semibold hover:text-brand-600" href={`/users/${answer.author.username}`}>{answer.author.username}</Link>
            <Badge role={answer.author.role} identity={answer.author.identityBadge} />
            {answer.isOfficial && <span className="rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-900">官方答案 · 官方授予</span>}
            {question.acceptedAnswerId === answer.id && <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900">最佳答案</span>}
            <time className="ml-auto text-xs text-slate-500">{answer.createdAt.toLocaleString("zh-CN")}</time>
          </div>
          <div className="mt-5"><Markdown>{answer.content}</Markdown></div>
          {user && <div className="mt-3"><ContentActions kind="answer" id={answer.id} content={answer.content} canEdit={user.id === answer.authorId || user.role === "ADMIN"} isAdmin={user.role === "ADMIN"} /></div>}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <ActionButton endpoint={`/api/answers/${answer.id}/vote`} label={`点赞 ${answer._count.votes}`} />
            {user && (user.id === question.authorId || user.role === "ADMIN") && <ActionButton endpoint={`/api/answers/${answer.id}/accept`} label="设为最佳答案" confirm="确定选择这条回答作为最佳答案吗？" />}
            {user && (user.role === "ADMIN" || user.identityBadge === "TEACHER") && <ActionButton endpoint={`/api/answers/${answer.id}/official`} label={answer.isOfficial ? "取消官方答案" : "标记为官方答案"} confirm="确认变更官方答案标识吗？" />}
            {user && <ReportButton targetType="Answer" targetId={answer.id} />}
          </div>
          <CommentThread comments={normalizeComments(answer.comments)} target={{ answerId: answer.id }} viewer={viewer} verified={verified} title="回答评论" />
        </article>)}
        {!question.answers.length && <div className="card py-12 text-center text-slate-500">还没有回答，成为第一个分享经验的人吧。</div>}
      </div>
    </section>
    {!question.isLocked && verified && <AnswerForm questionId={question.id} />}
    {question.isLocked && <div className="card mt-6 text-center text-slate-500">该问题已锁定，不能继续回答。</div>}
  </main>;
}
