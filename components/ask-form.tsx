"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "@/components/markdown-editor";

type Category = { id: string; name: string };
type Similar = { id: string; title: string; isSolved: boolean; _count: { answers: number }; acceptedAnswer: { content: string } | null };

export function AskForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [similar, setSimilar] = useState<Similar[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem("question-draft") ?? "null") as { title?: string; content?: string } | null;
      if (draft?.title) setTitle(draft.title);
      if (draft?.content) setContent(draft.content);
    } catch { localStorage.removeItem("question-draft"); }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (draftReady) localStorage.setItem("question-draft", JSON.stringify({ title, content }));
  }, [content, draftReady, title]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (title.length < 5) return setSimilar([]);
      const response = await fetch(`/api/search?q=${encodeURIComponent(title)}`);
      const body = await response.json();
      setSimilar((body.data?.questions ?? []).slice(0, 5));
    }, 350);
    return () => clearTimeout(timer);
  }, [title]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, categoryId: data.get("categoryId"), tagIds: [], draft: false })
    });
    const body = await response.json();
    if (!response.ok) return setError(body.error?.message ?? "发布失败");
    localStorage.removeItem("question-draft");
    router.push(`/questions/${body.data.id}`);
  }

  return <form onSubmit={submit} className="space-y-5">
    <label><span className="label">问题标题</span><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} minLength={8} maxLength={150} required placeholder="请用一句话概括问题" /></label>
    {similar.length > 0 && <aside className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><b>你要询问的问题可能已经有人提过，请先查看以下内容。</b><ul className="mt-2 space-y-2">{similar.map((question) => <li key={question.id}><a className="underline" href={`/questions/${question.id}`}>{question.title}</a> · {question.isSolved ? "已解决" : "未解决"} · {question._count.answers} 个回答{question.acceptedAnswer && <span className="block truncate text-sm">最佳答案：{question.acceptedAnswer.content}</span>}</li>)}</ul><p className="mt-2 text-xs">你仍可继续发布；推荐结果会用于改进重复问题识别。</p></aside>}
    <label><span className="label">分类</span><select className="input" name="categoryId" required><option value="">请选择</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <MarkdownEditor name="content" label="详细描述" value={content} onChange={setContent} minLength={20} maxLength={30000} required minHeightClass="min-h-56" placeholder="说明你已经了解的情况，避免填写手机号、学号等个人信息" />
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <button className="btn">发布问题</button>
  </form>;
}
