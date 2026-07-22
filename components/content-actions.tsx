"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/markdown-editor";

type QuestionProps = {
  kind: "question";
  id: string;
  title: string;
  content: string;
  categoryId: string;
  categories: Array<{ id: string; name: string }>;
  canEdit: boolean;
  isAdmin: boolean;
  isPinned: boolean;
  isLocked: boolean;
};
type AnswerProps = { kind: "answer"; id: string; content: string; canEdit: boolean; isAdmin: boolean };

export function ContentActions(props: QuestionProps | AnswerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function edit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = props.kind === "question"
      ? { title: form.get("title"), content: form.get("content"), categoryId: form.get("categoryId") }
      : { content: form.get("content") };
    const response = await fetch(`/api/${props.kind === "question" ? "questions" : "answers"}/${props.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setError(body.error?.message ?? "保存失败");
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    const label = props.kind === "question" ? "问题" : "回答";
    if (!window.confirm(`确定删除这条${label}吗？该操作将保留数据关系。`)) return;
    setBusy(true);
    const response = await fetch(`/api/${props.kind === "question" ? "questions" : "answers"}/${props.id}`, { method: "DELETE" });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setError(body.error?.message ?? "删除失败");
    if (props.kind === "question") router.push("/questions"); else router.refresh();
  }

  async function moderate(payload: Record<string, boolean | string>) {
    setBusy(true);
    const response = await fetch(`/api/questions/${props.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setError(body.error?.message ?? "管理操作失败");
    router.refresh();
  }

  return <>
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {props.canEdit && <button type="button" className="text-slate-500 hover:text-brand-600" onClick={() => setOpen(true)}>编辑</button>}
      {props.canEdit && <button type="button" className="text-slate-500 hover:text-red-600" onClick={remove} disabled={busy}>删除</button>}
      {props.kind === "question" && props.isAdmin && <>
        <button type="button" className="text-slate-500 hover:text-brand-600" onClick={() => moderate({ isPinned: !props.isPinned })}>{props.isPinned ? "取消置顶" : "置顶"}</button>
        <button type="button" className="text-slate-500 hover:text-brand-600" onClick={() => moderate({ isLocked: !props.isLocked })}>{props.isLocked ? "解锁" : "锁定"}</button>
        <button type="button" className="text-slate-500 hover:text-red-600" onClick={() => window.confirm("隐藏后普通用户将无法查看，确定继续吗？") && moderate({ status: "HIDDEN" })}>隐藏</button>
      </>}
    </div>
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    {open && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label={`编辑${props.kind === "question" ? "问题" : "回答"}`}>
      <form onSubmit={edit} className="card my-8 w-full max-w-2xl shadow-xl">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold">编辑{props.kind === "question" ? "问题" : "回答"}</h2><button type="button" className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setOpen(false)}>关闭</button></div>
        {props.kind === "question" && <>
          <label className="mt-5 block"><span className="label">标题</span><input className="input" name="title" defaultValue={props.title} minLength={8} maxLength={150} required /></label>
          <label className="mt-4 block"><span className="label">分类</span><select className="input" name="categoryId" defaultValue={props.categoryId}>{props.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        </>}
        <div className="mt-4"><MarkdownEditor name="content" label="正文" defaultValue={props.content} minLength={props.kind === "question" ? 20 : 2} maxLength={30000} required minHeightClass="min-h-64" /></div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setOpen(false)}>取消</button><button className="btn" disabled={busy}>{busy ? "保存中…" : "保存修改"}</button></div>
      </form>
    </div>}
  </>;
}
