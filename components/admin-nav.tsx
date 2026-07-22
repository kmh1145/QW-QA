"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/admin", "概览"],
  ["/admin/users", "用户"],
  ["/admin/questions", "问题"],
  ["/admin/answers", "回答"],
  ["/admin/comments", "评论"],
  ["/admin/reports", "举报"],
  ["/admin/categories", "分类"],
  ["/admin/tags", "标签"],
  ["/admin/announcements", "公告"],
  ["/admin/knowledge", "知识库"],
  ["/admin/ai", "AI 设置"],
  ["/admin/academic-year", "学年"],
  ["/admin/admins", "管理员"],
  ["/admin/audit-logs", "日志"],
  ["/admin/settings", "设置"]
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return <nav aria-label="后台管理导航" className="mb-7 flex flex-wrap gap-2">
    {links.map(([href, label]) => {
      const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
      return <Link
        aria-current={active ? "page" : undefined}
        className={active
          ? "rounded-xl border border-brand-300 bg-brand-100 px-3 py-2 text-sm font-semibold text-brand-800 shadow-sm dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200"
          : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:bg-brand-950/60"
        }
        href={href}
        key={href}
      >{label}</Link>;
    })}
  </nav>;
}
