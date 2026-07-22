"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReportActions({ id, disabled }: { id: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/reports/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: form.get("status"), resolution: form.get("resolution"), action: form.get("action"), accountAction: form.get("accountAction"), banDays: form.get("banDays") }) });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setError(body.error?.message ?? "处理失败");
    setOpen(false);
    router.refresh();
  }
  return <>
    <button type="button" className="btn-secondary !min-h-9 !py-1 text-sm" disabled={disabled} onClick={() => setOpen(true)}>{disabled ? "已处理" : "处理举报"}</button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4" role="dialog" aria-modal="true"><form onSubmit={submit} className="card my-6 w-full max-w-lg shadow-xl"><div className="flex justify-between"><h2 className="text-xl font-bold">填写处理结果</h2><button type="button" onClick={() => setOpen(false)}>关闭</button></div><label className="mt-5 block"><span className="label">结果</span><select className="input" name="status"><option value="RESOLVED">已处理</option><option value="IGNORED">忽略举报</option></select></label><label className="mt-4 block"><span className="label">内容处置</span><select className="input" name="action"><option value="NONE">不处理内容</option><option value="HIDE">隐藏内容</option><option value="DELETE">软删除内容</option></select><span className="mt-1 block text-xs text-slate-500">仅适用于问题、回答和评论；删除会保留数据关系。</span></label><label className="mt-4 block"><span className="label">账号处置</span><select className="input" name="accountAction"><option value="NONE">不处理账号</option><option value="WARN">发出警告</option><option value="BAN_TEMP">临时封禁</option><option value="BAN_PERMANENT">永久封禁</option></select></label><label className="mt-4 block"><span className="label">临时封禁天数</span><input className="input" type="number" name="banDays" defaultValue={7} min={1} max={365} /><span className="mt-1 block text-xs text-slate-500">仅选择“临时封禁”时生效。封禁会立即使该用户所有 Session 失效。</span></label><label className="mt-4 block"><span className="label">处理说明</span><textarea className="input min-h-28" name="resolution" minLength={2} maxLength={1000} required placeholder="该说明会通知举报人及受处置用户" /></label>{error && <p className="mt-3 text-sm text-red-600">{error}</p>}<button className="btn mt-5 w-full" disabled={busy}>{busy ? "提交中…" : "确认处理"}</button></form></div>}
  </>;
}
