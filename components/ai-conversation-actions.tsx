"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SourceList, type AISource } from "@/components/ai-chat";

export function AIConversationControls({ id, initialTitle }: { id: string; initialTitle: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function rename() {
    setBusy(true); setError("");
    const response = await fetch(`/api/ai/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    const body = await response.json(); setBusy(false);
    if (!response.ok) return setError(body.error?.message ?? "改名失败");
    setEditing(false); router.refresh();
  }
  async function remove() {
    if (!window.confirm("确定删除这段 AI 对话吗？历史消息将不再显示。")) return;
    setBusy(true);
    const response = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
    const body = await response.json(); setBusy(false);
    if (!response.ok) return setError(body.error?.message ?? "删除失败");
    router.push("/ai"); router.refresh();
  }
  return <div className="flex flex-wrap items-center gap-2">{editing ? <><label className="sr-only" htmlFor="conversation-title">对话标题</label><input id="conversation-title" className="input !min-h-9 max-w-sm" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={60} /><button className="btn !min-h-9 !py-1" type="button" disabled={busy} onClick={rename}>保存标题</button><button className="btn-secondary !min-h-9 !py-1" type="button" onClick={() => { setEditing(false); setTitle(initialTitle); }}>取消</button></> : <><button className="btn-secondary !min-h-9 !py-1" type="button" onClick={() => setEditing(true)}>修改标题</button><button className="btn-danger !min-h-9 !py-1" type="button" disabled={busy} onClick={remove}>删除对话</button></>}{error && <p role="alert" className="w-full text-sm text-red-600">{error}</p>}</div>;
}

export function AIMessageCard({ id, initialContent, initialSources, initialFeedback }: { id: string; initialContent: string; initialSources: AISource[]; initialFeedback: number | null }) {
  const [content, setContent] = useState(initialContent);
  const [sources, setSources] = useState(initialSources);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendFeedback(value: 1 | -1) {
    const next = feedback === value ? null : value;
    const response = await fetch(`/api/ai/messages/${id}/feedback`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: next }) });
    if (response.ok) setFeedback(next); else setError("反馈保存失败");
  }
  async function regenerate() {
    setBusy(true); setError(""); setContent(""); setSources([]);
    const response = await fetch(`/api/ai/messages/${id}/regenerate`, { method: "POST" });
    if (!response.ok) { const body = await response.json(); setError(body.error?.message ?? "重新生成失败"); setContent(initialContent); setBusy(false); return; }
    const reader = response.body?.getReader(); if (!reader) { setBusy(false); return; }
    const decoder = new TextDecoder(); let buffer = "";
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true }); const events = buffer.split("\n\n"); buffer = events.pop() ?? "";
      for (const item of events) {
        const type = item.match(/event: (.+)/)?.[1]; const data = item.match(/data: (.+)/)?.[1]; if (!data) continue;
        const parsed = JSON.parse(data) as { text?: string; message?: string; sources?: AISource[] };
        if (type === "delta" && parsed.text) setContent((current) => current + parsed.text);
        if (type === "meta") setSources(parsed.sources ?? []);
        if (type === "error") setError(parsed.message ?? "重新生成失败");
      }
    }
    setFeedback(null); setBusy(false);
  }

  return <div className="card mr-0 bg-brand-50 dark:bg-brand-950/20 sm:mr-10"><b className="text-sm">AI 助手</b><p className="mt-2 whitespace-pre-wrap">{content || (busy ? "正在重新生成…" : "")}</p><SourceList sources={sources} /><div className="mt-4 flex flex-wrap gap-2 border-t border-brand-100 pt-3 dark:border-brand-900"><button aria-pressed={feedback === 1} className={feedback === 1 ? "btn !min-h-9 !px-3 !py-1 text-sm" : "btn-secondary !min-h-9 !px-3 !py-1 text-sm"} type="button" disabled={busy} onClick={() => sendFeedback(1)}>有帮助</button><button aria-pressed={feedback === -1} className={feedback === -1 ? "btn !min-h-9 !px-3 !py-1 text-sm" : "btn-secondary !min-h-9 !px-3 !py-1 text-sm"} type="button" disabled={busy} onClick={() => sendFeedback(-1)}>没帮助</button><button className="btn-secondary !min-h-9 !px-3 !py-1 text-sm" type="button" disabled={busy} onClick={regenerate}>{busy ? "生成中…" : "重新生成"}</button><button className="btn-secondary !min-h-9 !px-3 !py-1 text-sm" type="button" disabled={!content} onClick={() => navigator.clipboard.writeText(content)}>复制</button></div>{error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}</div>;
}
