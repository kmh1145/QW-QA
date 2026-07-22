"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Moon, Sun, X } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("qa-theme");
    const next = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("qa-theme", next ? "dark" : "light");
  }
  return <button type="button" onClick={toggle} className="grid size-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>;
}

const links = [["/questions", "问题"], ["/categories", "分类"], ["/announcements", "公告"], ["/ai", "AI 助手"]] as const;
export function MobileNavigation({ isAdmin, authenticated }: { isAdmin: boolean; authenticated: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="md:hidden">
    <button type="button" className="grid size-10 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "关闭导航菜单" : "打开导航菜单"}>{open ? <X size={20} /> : <Menu size={20} />}</button>
    {open && <div className="absolute inset-x-0 top-16 border-b border-slate-200 bg-white p-4 shadow-lg dark:border-slate-800 dark:bg-slate-950"><nav className="container-page grid gap-1">{links.map(([href, label]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-medium hover:bg-slate-100 dark:hover:bg-slate-800">{label}</Link>)}{authenticated ? <Link href="/me" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-medium hover:bg-slate-100 dark:hover:bg-slate-800">个人中心</Link> : <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-medium hover:bg-slate-100 dark:hover:bg-slate-800">登录</Link>}{isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-medium text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40">管理后台</Link>}</nav></div>}
  </div>;
}
