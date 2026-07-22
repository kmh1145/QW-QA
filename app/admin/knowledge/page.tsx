import { db } from "@/lib/db";
import { KnowledgeForm } from "@/components/knowledge-form";
import { KnowledgeDeleteButton } from "@/components/knowledge-delete-button";

export default async function KnowledgeAdminPage() {
  const rows = await db.knowledgeDocument.findMany({
    include: { _count: { select: { chunks: true } }, uploadedBy: { select: { username: true } } },
    orderBy: { updatedAt: "desc" }
  });
  return <>
    <h1 className="text-3xl font-bold">知识库管理</h1>
    <p className="mt-2 text-slate-500">录入校园资料供 AI 检索；不再使用的旧资料可安全删除。</p>
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <KnowledgeForm />
      <div className="space-y-3">{rows.map((document) => <article className="card" key={document.id}>
        <div className="flex flex-wrap items-start justify-between gap-2"><b className="text-lg">{document.title}</b><span className="rounded-lg bg-brand-50 px-2 py-1 text-xs text-brand-800 dark:bg-brand-950 dark:text-brand-200">{document.status}</span></div>
        <p className="mt-2 text-sm text-slate-500">{document._count.chunks} 个片段 · {document.uploadedBy.username} · 更新于 {document.updatedAt.toLocaleString("zh-CN")}</p>
        {document.source && <p className="mt-2 text-sm">来源：{document.source}</p>}
        {document.errorMessage && <p className="mt-2 text-red-600">{document.errorMessage}</p>}
        <KnowledgeDeleteButton id={document.id} title={document.title} />
      </article>)}{rows.length === 0 && <div className="card text-center text-slate-500">暂无知识库资料</div>}</div>
    </div>
  </>;
}
