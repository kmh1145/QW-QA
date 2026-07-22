"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type SessionRow = { id: string; userAgent: string; ipAddress: string; lastSeenAt: string; current: boolean };

export function SecuritySettings({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function logoutOthers() {
    if (!window.confirm("确定退出当前设备以外的所有登录设备吗？")) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/me/sessions/others", { method: "DELETE" });
    const body = await response.json();
    setBusy(false);
    setMessage(response.ok ? `已退出 ${body.data.count} 个其他设备` : body.error?.message ?? "操作失败");
    if (response.ok) router.refresh();
  }

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!window.confirm("账号注销后无法登录，原有内容默认保留。确定继续吗？")) return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true); setMessage("");
    const response = await fetch("/api/me/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(body.error?.message ?? "注销失败");
    router.push("/"); router.refresh();
  }

  return <div className="space-y-5">
    <section className="card"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">有效登录设备 <span className="text-base font-normal text-slate-500">（{sessions.length}）</span></h2><p className="mt-1 text-sm text-slate-500">退出其他设备不会影响当前浏览器。</p></div><button className="btn-secondary" type="button" disabled={busy || sessions.filter((session) => !session.current).length === 0} onClick={logoutOthers}>退出其他设备</button></div>
      <ul className="mt-4 max-h-96 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200 px-4 text-sm dark:divide-slate-800 dark:border-slate-800">{sessions.map((session) => <li className="py-3" key={session.id}><div className="flex flex-wrap items-center gap-2"><b className="min-w-0 break-words">{session.userAgent}</b>{session.current && <span className="rounded-lg bg-brand-100 px-2 py-0.5 text-xs text-brand-800 dark:bg-brand-950 dark:text-brand-200">当前设备</span>}</div><span className="mt-1 block text-slate-500">{session.ipAddress} · 最近活动 {new Date(session.lastSeenAt).toLocaleString("zh-CN")}</span></li>)}</ul>
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    </section>
    <section className="card"><h2 className="text-xl font-bold">修改密码</h2><p className="mt-2 text-sm text-slate-500">通过经过验证的邮箱安全重置密码，完成后旧 Session 会全部失效。</p><Link className="btn-secondary mt-4" href="/forgot-password">前往密码重置</Link></section>
    <form className="card border-red-200 dark:border-red-900" onSubmit={deleteAccount}><h2 className="text-xl font-bold text-red-700 dark:text-red-300">注销账号</h2><p className="mt-2 text-sm text-slate-500">这是软注销：账号立即停用，原有公开内容默认保留。最后一名管理员不能注销。</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label><span className="label">当前密码</span><input className="input" type="password" name="password" required autoComplete="current-password" /></label><label><span className="label">输入“注销账号”确认</span><input className="input" name="confirmation" required /></label></div><button className="btn-danger mt-4" disabled={busy}>确认注销账号</button></form>
  </div>;
}
