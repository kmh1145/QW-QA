"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { IdentityBadge, Role, UserStatus } from "@prisma/client";
import { Badge } from "@/components/user-badge";

type AdminUserRow = {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  identityBadge: IdentityBadge;
  status: UserStatus;
  createdAt: string;
};

export function AdminUsersTable({ users, currentUserId }: { users: AdminUserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectableIds = users.filter((user) => user.id !== currentUserId).map((user) => user.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id));

  function toggleAll() {
    setSelected(allSelected ? [] : selectableIds);
  }

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function removeSelected() {
    if (!window.confirm(`确定批量删除选中的 ${selected.length} 名用户吗？账号会被停用并软删除，原有内容将保留。`)) return;
    setBusy(true);
    setError("");
    const response = await fetch("/api/admin/users/bulk-delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected })
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setError(body.error?.message ?? "批量删除失败");
    setSelected([]);
    router.refresh();
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm text-slate-600 dark:text-slate-300">已选择 <b className="text-brand-700 dark:text-brand-300">{selected.length}</b> 名用户；当前登录账号不可选择。</p>
      <button type="button" className="btn-danger !min-h-9 !px-3 !py-1.5 text-sm" disabled={selected.length === 0 || busy} onClick={removeSelected}>{busy ? "删除中…" : "批量删除"}</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead><tr>
          <th className="w-12"><label className="flex items-center"><span className="sr-only">选择全部用户</span><input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={selectableIds.length === 0} /></label></th>
          <th>用户</th><th>邮箱/验证</th><th>标识</th><th>状态</th><th>注册时间</th><th>操作</th>
        </tr></thead>
        <tbody>{users.map((user) => <tr className="border-t border-slate-200 dark:border-slate-800" key={user.id}>
          <td className="py-4"><label className="flex items-center"><span className="sr-only">选择用户 {user.username}</span><input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggle(user.id)} disabled={user.id === currentUserId} /></label></td>
          <td><Link className="font-semibold text-brand-700 hover:underline dark:text-brand-300" href={`/admin/users/${user.id}`}>{user.username}</Link></td>
          <td>{user.email}<br /><span className="text-xs text-slate-500">{user.emailVerified ? "已验证" : "未验证"}</span></td>
          <td><Badge role={user.role} identity={user.identityBadge} /></td>
          <td>{user.status}</td>
          <td>{new Date(user.createdAt).toLocaleDateString("zh-CN")}</td>
          <td><Link className="btn-secondary !min-h-9 !px-3 !py-1 text-xs" href={`/admin/users/${user.id}`}>查看详情</Link></td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
