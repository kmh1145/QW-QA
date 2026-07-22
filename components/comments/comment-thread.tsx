"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { IdentityBadge, Role } from "@prisma/client";
import { Badge } from "@/components/user-badge";
import { ReportButton } from "@/components/report-button";

type CommentAuthor = { id: string; username: string; role: Role; identityBadge: IdentityBadge };
export type CommentView = {
  id: string;
  content: string;
  authorId: string;
  author: CommentAuthor;
  createdAt: Date;
  updatedAt: Date;
  isHidden: boolean;
  deletedAt: Date | null;
  replies: CommentView[];
};

type Target = { answerId: string };
type Viewer = { id: string; role: Role } | null;

function CommentComposer({ target, parentId, onDone, compact = false }: { target: Target; parentId?: string; onDone?: () => void; compact?: boolean }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...target, parentId, content }) });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setError(body.error?.message ?? "评论发布失败");
    setContent("");
    onDone?.();
    router.refresh();
  }
  return <form onSubmit={submit} className={compact ? "mt-3" : "mt-4"}>
    <label className="sr-only" htmlFor={`comment-${parentId ?? Object.values(target)[0]}`}>{parentId ? "写回复" : "写评论"}</label>
    <textarea id={`comment-${parentId ?? Object.values(target)[0]}`} className={`input ${compact ? "min-h-20" : "min-h-24"}`} value={content} onChange={(event) => setContent(event.target.value)} maxLength={1000} required placeholder={parentId ? "礼貌回复，避免公开个人信息" : "补充信息或提出简短意见…"} />
    <div className="mt-2 flex items-center justify-between gap-3">
      <span className="text-xs text-slate-500">{content.length}/1000</span>
      <button className="btn !min-h-9 !px-4 !py-1.5 text-sm" disabled={busy}>{busy ? "提交中…" : parentId ? "发布回复" : "发表评论"}</button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </form>;
}

function CommentItem({ comment, target, viewer, verified, isReply = false }: { comment: CommentView; target: Target; viewer: Viewer; verified: boolean; isReply?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [error, setError] = useState("");
  const deleted = Boolean(comment.deletedAt);
  const hidden = comment.isHidden && !deleted;
  const wasEdited = !deleted && new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;
  const canEdit = viewer?.id === comment.authorId && !deleted;
  const canDelete = Boolean(viewer && !deleted && (viewer.id === comment.authorId || viewer.role === "ADMIN"));

  async function save() {
    setError("");
    const response = await fetch(`/api/comments/${comment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
    const body = await response.json();
    if (!response.ok) return setError(body.error?.message ?? "保存失败");
    setEditing(false);
    router.refresh();
  }
  async function remove() {
    if (!window.confirm("确定删除这条评论吗？回复关系会被保留。")) return;
    const response = await fetch(`/api/comments/${comment.id}`, { method: "DELETE" });
    if (!response.ok) { const body = await response.json(); return setError(body.error?.message ?? "删除失败"); }
    router.refresh();
  }

  return <div id={`comment-${comment.id}`} className={`scroll-mt-24 ${isReply ? "ml-5 border-l-2 border-slate-200 pl-4 dark:border-slate-700 sm:ml-9" : "border-t border-slate-200 py-4 first:border-t-0 dark:border-slate-800"}`}>
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Link className="font-semibold hover:text-brand-600" href={`/users/${comment.author.username}`}>{comment.author.username}</Link>
      <Badge role={comment.author.role} identity={comment.author.identityBadge} />
      <time className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString("zh-CN")}</time>
      {wasEdited && <span className="text-xs text-slate-400">已编辑</span>}
    </div>
    {editing ? <div className="mt-3">
      <textarea className="input min-h-24" value={content} onChange={(event) => setContent(event.target.value)} maxLength={1000} />
      <div className="mt-2 flex justify-end gap-2"><button type="button" className="btn-secondary !min-h-9 !py-1 text-sm" onClick={() => { setEditing(false); setContent(comment.content); }}>取消</button><button type="button" className="btn !min-h-9 !py-1 text-sm" onClick={save}>保存</button></div>
    </div> : <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${deleted || hidden ? "italic text-slate-400" : "text-slate-700 dark:text-slate-200"}`}>{hidden ? "[该评论已被管理员隐藏]" : comment.content}</p>}
    {!deleted && !hidden && <div className="mt-2 flex items-center gap-4 text-sm">
      {verified && !isReply && <button type="button" className="text-slate-500 hover:text-brand-600" onClick={() => setReplying((value) => !value)}>{replying ? "取消回复" : "回复"}</button>}
      {canEdit && <button type="button" className="text-slate-500 hover:text-brand-600" onClick={() => setEditing(true)}>编辑</button>}
      {canDelete && <button type="button" className="text-slate-500 hover:text-red-600" onClick={remove}>删除</button>}
      {viewer && <ReportButton targetType="Comment" targetId={comment.id} />}
    </div>}
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    {replying && <CommentComposer target={target} parentId={comment.id} compact onDone={() => setReplying(false)} />}
    {comment.replies.length > 0 && <div className="mt-4 space-y-4">{comment.replies.map((reply) => <CommentItem key={reply.id} comment={reply} target={target} viewer={viewer} verified={verified} isReply />)}</div>}
  </div>;
}

export function CommentThread({ comments, target, viewer, verified, title = "评论" }: { comments: CommentView[]; target: Target; viewer: Viewer; verified: boolean; title?: string }) {
  const count = comments.reduce((total, comment) => total + 1 + comment.replies.length, 0);
  return <section className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-950/60" aria-label={title}>
    <div className="flex items-center justify-between"><h3 className="font-semibold">{title} <span className="font-normal text-slate-500">{count}</span></h3></div>
    {verified ? <CommentComposer target={target} /> : <p className="mt-3 text-sm text-slate-500">{viewer ? <>完成<Link className="mx-1 text-brand-600 underline" href="/verify-email">邮箱验证</Link>后可以评论。</> : <><Link className="text-brand-600 underline" href="/login">登录</Link>后参与评论。</>}</p>}
    <div className="mt-4">{comments.map((comment) => <CommentItem key={comment.id} comment={comment} target={target} viewer={viewer} verified={verified} />)}{comments.length === 0 && <p className="py-4 text-center text-sm text-slate-500">暂无评论，欢迎补充。</p>}</div>
  </section>;
}
