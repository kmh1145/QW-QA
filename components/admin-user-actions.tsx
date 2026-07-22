"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IdentityBadge, Role } from "@prisma/client";

const identities: Array<{ value: IdentityBadge; label: string }> = [
  { value: "NONE", label: "暂无标识" },
  { value: "GRADE_1", label: "高一" },
  { value: "GRADE_2", label: "高二" },
  { value: "GRADE_3", label: "高三" },
  { value: "ALUMNI", label: "已毕业学长学姐" },
  { value: "TEACHER", label: "学校教师" }
];

export function AdminUserActions({ id, role, identity }: { id: string; role: Role; identity: IdentityBadge }) {
  const router = useRouter();
  const [nextRole, setNextRole] = useState<Role>(role);
  const [nextIdentity, setNextIdentity] = useState<IdentityBadge>(identity);
  const [busy, setBusy] = useState<"role" | "identity" | null>(null);
  const [error, setError] = useState("");

  async function change(kind: "role" | "identity", value: Role | IdentityBadge) {
    const changedLabel = kind === "role" ? "管理权限" : "身份标识";
    if (!window.confirm(`确定修改该用户的${changedLabel}吗？该操作会被记录到审计日志。`)) return;
    setBusy(kind);
    setError("");
    const response = await fetch(`/api/admin/users/${id}/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kind === "role" ? { role: value } : { identityBadge: value })
    });
    const body = await response.json();
    setBusy(null);
    if (!response.ok) return setError(body.error?.message ?? "操作失败");
    router.refresh();
  }

  return <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 dark:border-slate-800 sm:grid-cols-2">
    <div>
      <label htmlFor={`identity-${id}`} className="label">身份标识</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select id={`identity-${id}`} className="input" value={nextIdentity} onChange={(event) => setNextIdentity(event.target.value as IdentityBadge)}>
          {identities.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
        <button type="button" className="btn whitespace-nowrap" disabled={busy !== null || nextIdentity === identity} onClick={() => change("identity", nextIdentity)}>{busy === "identity" ? "保存中…" : "保存标识"}</button>
      </div>
      <p className="mt-2 text-xs text-slate-500">学校教师属于官方授予标识；年级和毕业生标识也可以由管理员代为调整。</p>
    </div>
    <div>
      <label htmlFor={`role-${id}`} className="label">管理权限</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select id={`role-${id}`} className="input" value={nextRole} onChange={(event) => setNextRole(event.target.value as Role)}>
          <option value="USER">普通用户</option>
          <option value="ADMIN">管理员</option>
        </select>
        <button type="button" className="btn whitespace-nowrap" disabled={busy !== null || nextRole === role} onClick={() => change("role", nextRole)}>{busy === "role" ? "保存中…" : "保存权限"}</button>
      </div>
      <p className="mt-2 text-xs text-slate-500">系统会阻止取消最后一名管理员的权限。</p>
    </div>
    {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
  </div>;
}
