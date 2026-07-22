"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/markdown-editor";

export function AnswerForm({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const response = await fetch(`/api/questions/${questionId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    const body = await response.json();
    if (!response.ok) return setError(body.error?.message ?? "提交失败");
    setContent("");
    form.reset();
    router.refresh();
  }

  return <form onSubmit={submit} className="card mt-6">
    <MarkdownEditor name="content" label="写下你的回答" value={content} onChange={setContent} minLength={2} maxLength={30000} required minHeightClass="min-h-40" placeholder="分享准确、友善的校园经验；重要事项请注明信息来源。" />
    {error && <p role="alert" className="mt-2 text-red-600">{error}</p>}
    <button className="btn mt-4">提交回答</button>
  </form>;
}
