"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function KnowledgeDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`确定删除知识库资料“${title}”吗？其所有检索片段也会一并删除。`)) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setError(body.error?.message ?? "删除失败");
    router.refresh();
  }

  return <div className="mt-4">
    <button type="button" className="btn-danger !min-h-9 !px-3 !py-1.5 text-sm" disabled={busy} onClick={remove}>{busy ? "删除中…" : "删除资料"}</button>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </div>;
}
