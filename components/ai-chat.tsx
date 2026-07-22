"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AISource = { title: string; type: string; url: string; content: string; updatedAt: string; score: number; matchedTerms: string[] };

export function SourceList({ sources }: { sources: AISource[] }) {
  if (!sources.length) return null;
  return <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800"><h3 className="font-semibold">引用来源（按相关度排序）</h3><ol className="mt-3 space-y-3 text-sm">{sources.map((source, index) => <li className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60" key={`${source.url}-${index}`}><div className="flex flex-wrap items-center gap-2"><span className="font-medium text-slate-500">{index + 1}.</span><a className="font-medium text-brand-700 underline dark:text-brand-300" href={source.url}>{source.title}</a><span className="rounded-md bg-brand-100 px-1.5 py-0.5 text-xs text-brand-800 dark:bg-brand-950 dark:text-brand-200">{source.type}</span><span className="text-xs text-slate-500">相关度 {Math.round(source.score)}</span></div><p className="mt-2 line-clamp-3 text-slate-600 dark:text-slate-300">{source.content}</p>{source.matchedTerms.length > 0 && <p className="mt-2 text-xs text-slate-400">命中：{source.matchedTerms.join("、")}</p>}</li>)}</ol></div>;
}

export function AIChat({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<AISource[]>([]);
  const [error, setError] = useState("");
  const [controller, setController] = useState<AbortController>();

  async function send(event: React.FormEvent) {
    event.preventDefault(); setAnswer(""); setSources([]); setError("");
    const abort = new AbortController(); setController(abort);
    let createdConversationId = conversationId;
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, conversationId }), signal: abort.signal });
      if (!response.ok) { const body = await response.json(); setError(body.error?.message ?? "AI 暂时不可用"); return; }
      const reader = response.body?.getReader(); if (!reader) return;
      const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n"); buffer = events.pop() ?? "";
        for (const item of events) {
          const type = item.match(/event: (.+)/)?.[1]; const data = item.match(/data: (.+)/)?.[1]; if (!data) continue;
          const parsed = JSON.parse(data) as { text?: string; message?: string; conversationId?: string; sources?: AISource[] };
          if (type === "delta" && parsed.text) setAnswer((current) => current + parsed.text);
          if (type === "meta") { setSources(parsed.sources ?? []); createdConversationId = parsed.conversationId ?? createdConversationId; }
          if (type === "error") setError(parsed.message ?? "生成失败");
          if (type === "done") { setPrompt(""); if (createdConversationId) { router.push(`/ai/${createdConversationId}`); router.refresh(); } }
        }
      }
    } catch (requestError) {
      if (!(requestError instanceof DOMException && requestError.name === "AbortError")) setError("网络连接中断，请稍后重试");
    } finally { setController(undefined); }
  }

  return <div className="space-y-5"><div className="card min-h-64" aria-live="polite">{answer ? <div className="whitespace-pre-wrap">{answer}</div> : <p className="text-slate-500">我会优先检索学校资料、公告和历史问答。重要事项请以学校最新通知为准。</p>}<SourceList sources={sources} /></div><form onSubmit={send} className="card"><label><span className="label">向校园 AI 助手提问</span><textarea className="input min-h-28" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={2000} required /></label><div className="mt-3 flex flex-wrap gap-3"><button className="btn" disabled={Boolean(controller)}>发送</button>{controller && <button type="button" className="btn-secondary" onClick={() => controller.abort()}>停止生成</button>}{answer && <button type="button" className="btn-secondary" onClick={() => navigator.clipboard.writeText(answer)}>复制回答</button>}</div>{error && <p role="alert" className="mt-3 text-red-600">{error}</p>}</form></div>;
}
