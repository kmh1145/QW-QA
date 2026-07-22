import Link from "next/link";
import type { IdentityBadge, Role } from "@prisma/client";
import { Badge } from "./user-badge";

type QuestionCardProps = { question: {
  id: string;
  title: string;
  isSolved: boolean;
  isPinned: boolean;
  viewCount: number;
  createdAt: Date;
  author: { username: string; role: Role; identityBadge: IdentityBadge };
  category: { name: string; slug: string };
  _count: { answers: number; votes: number };
} };

export function QuestionCard({ question }: QuestionCardProps) {
  const stats = [
    [question._count.votes, "点赞"],
    [question._count.answers, "回答"],
    [question.viewCount, "浏览"]
  ] as const;
  return <article className="card transition hover:-translate-y-0.5 hover:border-brand-600/40 hover:shadow-md">
    <div className="flex flex-col items-start gap-5 sm:flex-row">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          {question.isPinned && <span className="rounded-lg bg-amber-100 px-2 py-1 font-medium text-amber-900">置顶</span>}
          {question.isSolved && <span className="rounded-lg bg-emerald-100 px-2 py-1 font-medium text-emerald-900">已解决</span>}
          <Link href={`/categories/${question.category.slug}`} className="rounded-lg bg-brand-50 px-2 py-1 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">{question.category.name}</Link>
        </div>
        <Link href={`/questions/${question.id}`} className="break-words text-lg font-semibold leading-snug hover:text-brand-600">{question.title}</Link>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link className="hover:text-brand-600" href={`/users/${question.author.username}`}>{question.author.username}</Link>
          <Badge role={question.author.role} identity={question.author.identityBadge} />
          <span>{new Intl.DateTimeFormat("zh-CN").format(question.createdAt)}</span>
        </div>
      </div>
      <div className="grid w-full shrink-0 grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-slate-950 sm:w-auto sm:gap-5 sm:bg-transparent sm:p-0 dark:sm:bg-transparent">
        {stats.map(([value, label]) => <span className="min-w-14 rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-slate-900 sm:bg-slate-50 dark:sm:bg-slate-800" key={label}><b className="block text-base text-slate-900 dark:text-white">{value}</b>{label}</span>)}
      </div>
    </div>
  </article>;
}
