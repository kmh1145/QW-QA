import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Badge } from "./user-badge";
import { LogoutButton } from "./logout-button";
import { MobileNavigation, ThemeToggle } from "./site-controls";

export async function Header() {
  const user = await getCurrentUser();
  return <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
    <div className="container-page flex min-h-16 items-center gap-3 sm:gap-5">
      <MobileNavigation isAdmin={user?.role === "ADMIN"} authenticated={Boolean(user)} />
      <Link href="/" className="min-w-0 truncate font-bold tracking-tight text-brand-700 dark:text-brand-300"><span className="hidden sm:inline">清华附中湾区学校</span>新生Q&amp;A</Link>
      <nav className="hidden items-center gap-1 text-sm md:flex">
        <Link className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/questions">问题</Link>
        <Link className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/categories">分类</Link>
        <Link className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/announcements">公告</Link>
        <Link className="rounded-lg px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800" href="/ai">AI 助手</Link>
        {user?.role === "ADMIN" && <Link className="rounded-lg px-3 py-2 text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950/40" href="/admin">管理后台</Link>}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        {user ? <>
          <Link href="/me" className="hidden items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 sm:flex"><span className="max-w-24 truncate text-sm font-medium">{user.username}</span><Badge role={user.role} identity={user.identityBadge} compact /></Link>
          <LogoutButton />
        </> : <>
          <Link className="hidden text-sm sm:inline" href="/login">登录</Link>
          <Link className="btn !min-h-9 !rounded-lg !px-3 !py-1.5 text-sm" href="/register">注册</Link>
        </>}
      </div>
    </div>
  </header>;
}
