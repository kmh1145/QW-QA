import Link from "next/link";
import { db } from "@/lib/db";

export default async function CommentsAdminPage() {
  const rows = await db.comment.findMany({
    include: {
      author: { select: { username: true } },
      answer: { select: { id: true, question: { select: { id: true, title: true } } } },
      question: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return <>
    <h1 className="text-3xl font-bold">评论管理</h1>
    <p className="mt-2 text-slate-500">点击评论可跳转到对应问题或回答的原文位置。</p>
    <div className="mt-5 space-y-3">{rows.map((comment) => {
      const question = comment.answer?.question ?? comment.question;
      const href = question ? `/questions/${question.id}${comment.answer ? `#comment-${comment.id}` : ""}` : "#";
      return <Link className="card block transition hover:border-brand-300 hover:bg-brand-50/60 dark:hover:border-brand-700 dark:hover:bg-brand-950/20" href={href} key={comment.id}>
        <div className="flex flex-wrap items-center justify-between gap-2"><b>{comment.author.username}</b><time className="text-xs text-slate-500">{comment.createdAt.toLocaleString("zh-CN")}</time></div>
        <p className="mt-2 whitespace-pre-wrap text-sm">{comment.deletedAt ? "[已删除]" : comment.isHidden ? "[已隐藏]" : comment.content}</p>
        <p className="mt-2 text-xs text-brand-700 dark:text-brand-300">前往原文：{question?.title ?? "原内容不可用"} →</p>
      </Link>;
    })}{rows.length === 0 && <div className="card text-center text-slate-500">暂无评论</div>}</div>
  </>;
}
