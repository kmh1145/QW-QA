"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/me", "概览"],
  ["/me/questions", "我的提问"],
  ["/me/answers", "我的回答"],
  ["/me/favorites", "收藏"],
  ["/me/notifications", "通知"],
  ["/me/settings", "设置"],
  ["/me/security", "安全"]
] as const;

export function MeNav() {
  const pathname = usePathname();
  return <nav aria-label="个人中心导航" className="mb-6 flex flex-wrap gap-2 text-sm">
    {links.map(([href, label]) => {
      const active = href === "/me" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
      return <Link aria-current={active ? "page" : undefined} className={active
        ? "rounded-xl border border-brand-300 bg-brand-100 px-3 py-2 font-semibold text-brand-800 shadow-sm dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200"
        : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:bg-brand-950/60"
      } href={href} key={href}>{label}</Link>;
    })}
  </nav>;
}
