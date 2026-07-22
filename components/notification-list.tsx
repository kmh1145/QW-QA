"use client";

import Link from "next/link";
import { useState } from "react";

type NotificationRow = {
  id: string;
  title: string;
  content: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationList({ initialRows }: { initialRows: NotificationRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function remove(id: string) {
    setBusyId(id);
    setError("");
    const response = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    const body = await response.json();
    setBusyId("");
    if (!response.ok) return setError(body.error?.message ?? "删除失败");
    setRows((current) => current.filter((row) => row.id !== id));
  }

  return <div className="mt-5 space-y-3">
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {rows.map((row) => <article className={`card ${!row.read ? "border-brand-500 bg-brand-50/40 dark:bg-brand-950/20" : ""}`} key={row.id}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">{row.link ? <Link className="font-bold hover:text-brand-700" href={row.link}>{row.title}</Link> : <b>{row.title}</b>}<p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.content}</p><time className="mt-2 block text-xs text-slate-500">{new Date(row.createdAt).toLocaleString("zh-CN")}</time></div>
        <button type="button" className="shrink-0 text-sm text-slate-500 hover:text-red-600" disabled={busyId === row.id} onClick={() => remove(row.id)}>{busyId === row.id ? "删除中…" : "删除"}</button>
      </div>
    </article>)}
    {rows.length === 0 && <div className="card py-12 text-center text-slate-500">暂无通知</div>}
  </div>;
}
