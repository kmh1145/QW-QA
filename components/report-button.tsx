"use client";

import { useState } from "react";

const reasons = [
  ["SPAM", "垃圾信息"],
  ["HARASSMENT", "人身攻击"],
  ["MISINFORMATION", "不实信息"],
  ["PRIVACY", "泄露隐私"],
  ["IMPERSONATION", "冒充教师或管理员"],
  ["ILLEGAL", "违法违规内容"],
  ["OTHER", "其他"]
] as const;

export function ReportButton({ targetType, targetId }: { targetType: "Question" | "Answer" | "Comment" | "User"; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason: form.get("reason"), details: form.get("details") })
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(body.error?.message ?? "举报提交失败");
    setMessage("举报已提交，感谢你的反馈。");
    window.setTimeout(() => setOpen(false), 1000);
  }

  return <>
    <button type="button" className="text-sm text-slate-500 hover:text-red-600" onClick={() => setOpen(true)}>举报</button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="举报内容">
      <form onSubmit={submit} className="card w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">举报内容</h2>
          <button type="button" className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setOpen(false)}>关闭</button>
        </div>
        <label className="mt-5 block"><span className="label">举报原因</span><select className="input" name="reason" required>{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="mt-4 block"><span className="label">补充说明（可选）</span><textarea className="input min-h-28" name="details" maxLength={1000} /></label>
        {message && <p className={`mt-3 text-sm ${message.startsWith("举报已") ? "text-emerald-600" : "text-red-600"}`}>{message}</p>}
        <button className="btn mt-5 w-full" disabled={busy}>{busy ? "提交中…" : "提交举报"}</button>
      </form>
    </div>}
  </>;
}
