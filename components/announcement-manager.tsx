"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/markdown-editor";

type AnnouncementRow = {
  id: string;
  title: string;
  summary: string;
  content: string;
  isPinned: boolean;
  isPublic: boolean;
  publishedAt: string;
  authorName: string;
};

function localDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

async function responseError(response: Response) {
  const body = await response.json();
  return body.error?.message ?? "操作失败";
}

function payload(form: HTMLFormElement, content: string) {
  const data = new FormData(form);
  return {
    title: data.get("title"), summary: data.get("summary"), content,
    isPinned: data.has("isPinned"), isPublic: data.has("isPublic"),
    publishedAt: new Date(String(data.get("publishedAt"))).toISOString()
  };
}

function AnnouncementEditor({ row }: { row: AnnouncementRow }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState(row.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(`/api/admin/announcements/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(event.currentTarget, content)) });
    setBusy(false); if (!response.ok) return setError(await responseError(response)); router.refresh();
  }
  async function remove() {
    if (!window.confirm(`确定删除公告“${row.title}”吗？公告会被软删除并立即停止公开。`)) return;
    setBusy(true); const response = await fetch(`/api/admin/announcements/${row.id}`, { method: "DELETE" }); setBusy(false);
    if (!response.ok) return setError(await responseError(response)); router.refresh();
  }

  return <article className="card">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold">{row.title}</h2><p className="mt-1 text-xs text-slate-500">{row.authorName} · {new Date(row.publishedAt).toLocaleString("zh-CN")} · {row.isPublic ? "公开" : "草稿"}{row.isPinned ? " · 置顶" : ""}</p></div><div className="flex gap-2"><button type="button" className="btn-secondary !min-h-9 !py-1 text-sm" onClick={() => setExpanded((value) => !value)}>{expanded ? "收起编辑" : "编辑"}</button><button type="button" className="btn-danger !min-h-9 !py-1 text-sm" disabled={busy} onClick={remove}>删除</button></div></div>
    {expanded && <form className="mt-5 space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800" onSubmit={save}><label className="block"><span className="label">标题</span><input className="input" name="title" defaultValue={row.title} maxLength={150} required /></label><label className="block"><span className="label">摘要</span><textarea className="input min-h-20" name="summary" defaultValue={row.summary} maxLength={300} required /></label><MarkdownEditor name="content" label="正文" value={content} onChange={setContent} required minLength={2} maxLength={50_000} /><label className="block"><span className="label">发布时间</span><input className="input" name="publishedAt" type="datetime-local" defaultValue={localDateTime(row.publishedAt)} required /></label><div className="flex flex-wrap gap-4"><label className="choice-label"><input name="isPublic" type="checkbox" defaultChecked={row.isPublic} />公开发布</label><label className="choice-label"><input name="isPinned" type="checkbox" defaultChecked={row.isPinned} />置顶公告</label></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button className="btn" disabled={busy}>{busy ? "保存中…" : "保存公告"}</button></form>}
  </article>;
}

export function AnnouncementManager({ rows }: { rows: AnnouncementRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(event.currentTarget, content)) });
    setBusy(false); if (!response.ok) return setError(await responseError(response)); setContent(""); setOpen(false); router.refresh();
  }
  return <div className="mt-5 space-y-4"><button type="button" className="btn" onClick={() => setOpen((value) => !value)}>{open ? "取消新增" : "新增公告"}</button>{open && <form className="card space-y-4 border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-950/20" onSubmit={create}><h2 className="text-xl font-bold">创建公告</h2><label className="block"><span className="label">标题</span><input className="input" name="title" maxLength={150} required /></label><label className="block"><span className="label">摘要</span><textarea className="input min-h-20" name="summary" maxLength={300} required /></label><MarkdownEditor name="content" label="正文" value={content} onChange={setContent} required minLength={2} maxLength={50_000} /><label className="block"><span className="label">发布时间</span><input className="input" name="publishedAt" type="datetime-local" defaultValue={localDateTime(new Date().toISOString())} required /></label><div className="flex gap-4"><label className="choice-label"><input name="isPublic" type="checkbox" defaultChecked />公开发布</label><label className="choice-label"><input name="isPinned" type="checkbox" />置顶公告</label></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button className="btn" disabled={busy}>{busy ? "发布中…" : "创建公告"}</button></form>}<div className="space-y-3">{rows.map((row) => <AnnouncementEditor key={row.id} row={row} />)}{rows.length === 0 && <div className="card py-12 text-center text-slate-500">暂无公告，点击“新增公告”创建第一条。</div>}</div></div>;
}
