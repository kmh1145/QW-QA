import Link from "next/link";
import { db } from "@/lib/db";
import { ReportActions } from "@/components/report-actions";

const reasonLabels: Record<string, string> = { SPAM: "垃圾信息", HARASSMENT: "人身攻击", MISINFORMATION: "不实信息", PRIVACY: "泄露隐私", IMPERSONATION: "身份冒充", ILLEGAL: "违法违规", OTHER: "其他" };
function targetLink(type: string, id: string) {
  if (type === "Question") return `/questions/${id}`;
  return null;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ status?: "PENDING" | "RESOLVED" | "IGNORED" }> }) {
  const { status = "PENDING" } = await searchParams;
  const rows = await db.report.findMany({ where: { status }, include: { reporter: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">举报管理</h1><p className="mt-1 text-sm text-slate-500">优先处理隐私泄露、身份冒充和违法违规内容。</p></div><div className="flex gap-2"><Link className="btn-secondary" href="/admin/reports?status=PENDING">待处理</Link><Link className="btn-secondary" href="/admin/reports?status=RESOLVED">已处理</Link><Link className="btn-secondary" href="/admin/reports?status=IGNORED">已忽略</Link></div></div>
    <div className="mt-6 space-y-4">{rows.map((report) => {
      const link = targetLink(report.targetType, report.targetId);
      return <article className="card" key={report.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><span className="rounded-lg bg-red-50 px-2.5 py-1 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-200">{reasonLabels[report.reason]}</span><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm dark:bg-slate-800">{report.status}</span></div><h2 className="mt-3 font-semibold">{report.targetType} / {report.targetId}</h2>{link && <Link className="mt-1 inline-block text-sm text-brand-600 underline" href={link}>查看被举报内容</Link>}<p className="mt-3 whitespace-pre-wrap text-sm">{report.details || "举报人未填写补充说明"}</p><p className="mt-3 text-xs text-slate-500">举报人：{report.reporter.username} · {report.createdAt.toLocaleString("zh-CN")}</p>{report.resolution && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">处理结果：{report.resolution}</p>}</div><ReportActions id={report.id} disabled={report.status !== "PENDING"} /></div></article>;
    })}{rows.length === 0 && <div className="card py-12 text-center text-slate-500">当前筛选条件下没有举报。</div>}</div>
  </>;
}
