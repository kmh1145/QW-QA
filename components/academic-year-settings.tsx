"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AcademicYearSettingsProps = {
  year: {
    name: string;
    startsAt: string;
    endsAt: string;
    allowIdentityChange: boolean;
    cooldownDays: number;
    showSelfSelectedNotice: boolean;
  };
};

export function AcademicYearSettings({ year }: AcademicYearSettingsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/academic-year", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        startsAt: data.get("startsAt"),
        endsAt: data.get("endsAt"),
        allowIdentityChange: data.has("allowIdentityChange"),
        cooldownDays: Number(data.get("cooldownDays")),
        showSelfSelectedNotice: data.has("showSelfSelectedNotice")
      })
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(body.error?.message ?? "保存失败");
    setMessage("学年设置已保存");
    router.refresh();
  }

  return <form className="card my-5 space-y-5" onSubmit={submit}>
    <div><h2 className="text-xl font-bold">当前学年设置</h2><p className="mt-1 text-sm text-slate-500">起止日期均可按学校实际校历调整。</p></div>
    <div className="grid gap-4 md:grid-cols-3">
      <label><span className="label">学年名称</span><input className="input" name="name" defaultValue={year.name} required maxLength={30} /></label>
      <label><span className="label">开始日期</span><input className="input" type="date" name="startsAt" defaultValue={year.startsAt} required /></label>
      <label><span className="label">结束日期</span><input className="input" type="date" name="endsAt" defaultValue={year.endsAt} required /></label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label><span className="label">年级修改冷却时间（天）</span><input className="input" type="number" name="cooldownDays" min={0} max={365} defaultValue={year.cooldownDays} required /></label>
      <div className="space-y-3 pt-1 sm:pt-7">
        <label className="choice-label"><input type="checkbox" name="allowIdentityChange" defaultChecked={year.allowIdentityChange} />允许用户自行修改年级</label>
        <label className="choice-label"><input type="checkbox" name="showSelfSelectedNotice" defaultChecked={year.showSelfSelectedNotice} />显示“用户自选身份”提示</label>
      </div>
    </div>
    {message && <p role="status" className={message.includes("已保存") ? "text-sm text-emerald-700" : "text-sm text-red-600"}>{message}</p>}
    <button className="btn" disabled={busy}>{busy ? "保存中…" : "保存学年设置"}</button>
  </form>;
}
