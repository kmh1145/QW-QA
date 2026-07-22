"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/user-avatar";

export function ProfileSettings({ username, bio, avatarUrl }: { username: string; bio: string | null; avatarUrl: string | null }) {
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState(avatarUrl ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setMessage("");
    const response = await fetch("/api/me/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await response.json();
    setBusy(false);
    setMessage(response.ok ? "个人资料已更新" : body.error?.message ?? "保存失败");
    if (response.ok) router.refresh();
  }

  return <form className="card" onSubmit={submit}>
    <div className="flex items-center gap-4"><UserAvatar username={username} avatarUrl={previewUrl} size="lg" /><div><h2 className="text-xl font-bold">个人资料与头像</h2><p className="mt-1 text-sm text-slate-500">头像支持 HTTPS 图片地址或站内图片路径。</p></div></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label><span className="label">用户名</span><input className="input" name="username" defaultValue={username} minLength={3} maxLength={20} required /></label>
      <label><span className="label">头像地址</span><input className="input" name="avatarUrl" value={previewUrl} onChange={(event) => setPreviewUrl(event.target.value)} placeholder="https://example.com/avatar.jpg" /></label>
    </div>
    <label className="mt-4 block"><span className="label">个人简介</span><textarea className="input min-h-28" name="bio" defaultValue={bio ?? ""} maxLength={500} placeholder="简单介绍一下自己，避免填写联系方式等隐私信息。" /></label>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    <button className="btn mt-4" disabled={busy}>{busy ? "保存中…" : "保存个人资料"}</button>
  </form>;
}

export function EmailChangeForm({ currentEmail }: { currentEmail: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true); setMessage("");
    const response = await fetch("/api/me/email-change", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const body = await response.json();
    setBusy(false);
    setMessage(response.ok ? body.data.message : body.error?.message ?? "申请失败");
    if (response.ok) form.reset();
  }
  return <form className="card" onSubmit={submit}>
    <h2 className="text-xl font-bold">更换邮箱</h2><p className="mt-1 text-sm text-slate-500">当前邮箱：{currentEmail}。新邮箱必须点击确认邮件后才会生效，届时所有设备需要重新登录。</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><label><span className="label">新邮箱</span><input className="input" name="email" type="email" required /></label><label><span className="label">当前密码</span><input className="input" name="password" type="password" autoComplete="current-password" required /></label></div>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    <button className="btn mt-4" disabled={busy}>{busy ? "发送中…" : "发送新邮箱确认邮件"}</button>
  </form>;
}
