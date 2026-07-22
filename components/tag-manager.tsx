"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type TagRow = { id: string; name: string; slug: string; isActive: boolean; questionCount: number };
async function errorMessage(response: Response) { const body = await response.json(); return body.error?.message ?? "操作失败"; }

function TagEditor({ tag }: { tag: TagRow }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true); setError(""); const response = await fetch(`/api/admin/tags/${tag.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), slug: data.get("slug"), isActive: data.has("isActive") }) }); setBusy(false); if (!response.ok) return setError(await errorMessage(response)); router.refresh(); }
  async function remove() { if (!window.confirm(`确定删除空标签“${tag.name}”吗？`)) return; setBusy(true); const response = await fetch(`/api/admin/tags/${tag.id}`, { method: "DELETE" }); setBusy(false); if (!response.ok) return setError(await errorMessage(response)); router.refresh(); }
  return <form className="card grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={save}><label><span className="label">标签名称</span><input className="input" name="name" defaultValue={tag.name} required maxLength={30} /></label><label><span className="label">网址标识</span><input className="input" name="slug" defaultValue={tag.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label><div className="flex flex-wrap items-center gap-2 pb-1"><label className="choice-label"><input type="checkbox" name="isActive" defaultChecked={tag.isActive} />启用</label><button className="btn !min-h-9 !py-1" disabled={busy}>保存</button><button className="btn-danger !min-h-9 !py-1" type="button" disabled={busy || tag.questionCount > 0} onClick={remove}>删除</button></div><p className="text-xs text-slate-500 sm:col-span-3">{tag.questionCount} 个问题{tag.questionCount > 0 && " · 有引用时只能停用"}</p>{error && <p role="alert" className="text-sm text-red-600 sm:col-span-3">{error}</p>}</form>;
}

export function TagManager({ tags }: { tags: TagRow[] }) {
  const router = useRouter(); const [error, setError] = useState("");
  async function create(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); const response = await fetch("/api/admin/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); if (!response.ok) return setError(await errorMessage(response)); form.reset(); setError(""); router.refresh(); }
  return <div className="mt-5 space-y-4"><form className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-950/40" onSubmit={create}><h2 className="text-lg font-bold">新增标签</h2><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label><span className="label">标签名称</span><input className="input" name="name" required maxLength={30} placeholder="例如：住宿" /></label><label><span className="label">网址标识</span><input className="input" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="dorm-life" /></label><button className="btn">新增标签</button></div>{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}</form><div className="space-y-3">{tags.map((tag) => <TagEditor tag={tag} key={tag.id} />)}</div></div>;
}
