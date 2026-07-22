"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/markdown-editor";

export function KnowledgeForm() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: data.get("title"), source: data.get("source"), content })
    });
    const body = await response.json();
    setMessage(response.ok ? `已切分为 ${body.data.chunkCount} 个知识片段` : body.error?.message ?? "保存失败");
    if (response.ok) {
      form.reset();
      setContent("");
      router.refresh();
    }
  }

  return <form onSubmit={submit} className="card space-y-4">
    <h2 className="text-xl font-bold">创建 FAQ / 文本资料</h2>
    <label><span className="label">标题</span><input className="input" name="title" required maxLength={200} /></label>
    <label><span className="label">来源</span><input className="input" name="source" placeholder="如：学生处 2026 年通知" /></label>
    <MarkdownEditor name="content" label="正文" value={content} onChange={setContent} minLength={10} maxLength={500000} required minHeightClass="min-h-52" placeholder="可使用标题、列表、链接等 Markdown 格式整理资料。" />
    <button className="btn">保存并切分</button>
    {message && <p role="status">{message}</p>}
    <p className="text-xs text-slate-500">当前可直接录入 TXT/Markdown 内容；PDF/DOCX 自动提取尚未接入。</p>
  </form>;
}
