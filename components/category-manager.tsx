"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  questionCount: number;
};

async function readError(response: Response) {
  const body = await response.json();
  return body.error?.message ?? "操作失败";
}

function CategoryEditor({ category }: { category: CategoryRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug"),
        description: form.get("description"),
        sortOrder: Number(form.get("sortOrder")),
        isActive: form.get("isActive") === "on"
      })
    });
    setBusy(false);
    if (!response.ok) return setError(await readError(response));
    router.refresh();
  }

  async function remove() {
    if (!window.confirm(`确定删除分类“${category.name}”吗？此操作仅允许用于没有问题的空分类。`)) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) return setError(await readError(response));
    router.refresh();
  }

  return <form onSubmit={save} className="card grid gap-4 lg:grid-cols-[1fr_1fr_90px_auto] lg:items-end">
    <label><span className="label">分类名称</span><input className="input" name="name" defaultValue={category.name} maxLength={30} required /></label>
    <label><span className="label">网址标识</span><input className="input" name="slug" defaultValue={category.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label>
    <label><span className="label">排序</span><input className="input" name="sortOrder" type="number" min={0} max={9999} defaultValue={category.sortOrder} required /></label>
    <div className="flex flex-wrap items-center gap-3 lg:pb-1">
      <label className="choice-label"><input name="isActive" type="checkbox" defaultChecked={category.isActive} />启用</label>
      <button className="btn !min-h-10" disabled={busy}>{busy ? "保存中…" : "保存"}</button>
      <button className="btn-danger !min-h-10" disabled={busy || category.questionCount > 0} onClick={remove} type="button">删除</button>
    </div>
    <label className="lg:col-span-3"><span className="label">分类说明</span><input className="input" name="description" defaultValue={category.description} maxLength={200} /></label>
    <p className="text-sm text-slate-500 lg:pb-3">{category.questionCount} 个问题{category.questionCount > 0 && " · 有内容时请停用而非删除"}</p>
    {error && <p role="alert" className="text-sm text-red-600 lg:col-span-4">{error}</p>}
  </form>;
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        slug: form.get("slug"),
        description: form.get("description"),
        sortOrder: Number(form.get("sortOrder"))
      })
    });
    setBusy(false);
    if (!response.ok) return setError(await readError(response));
    formElement.reset();
    router.refresh();
  }

  return <div className="mt-6 space-y-4">
    <form onSubmit={create} className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-950/50">
      <h2 className="text-lg font-bold">新增分类</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_100px_auto] lg:items-end">
        <label><span className="label">分类名称</span><input className="input" name="name" maxLength={30} required placeholder="例如：国际交流" /></label>
        <label><span className="label">网址标识</span><input className="input" name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required placeholder="international-exchange" /></label>
        <label><span className="label">排序</span><input className="input" name="sortOrder" type="number" min={0} max={9999} defaultValue={categories.length} required /></label>
        <button className="btn" disabled={busy}>{busy ? "创建中…" : "新增分类"}</button>
        <label className="md:col-span-2 lg:col-span-4"><span className="label">分类说明</span><input className="input" name="description" maxLength={200} placeholder="简要说明该分类涵盖的问题" /></label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
    <div className="space-y-3">{categories.map((category) => <CategoryEditor category={category} key={category.id} />)}</div>
  </div>;
}
