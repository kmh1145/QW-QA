import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AdminUsersTable } from "@/components/admin-users-table";

export default async function UsersAdminPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: "ADMIN" | "USER" }> }) {
  const [params, admin] = await Promise.all([searchParams, requireAdmin()]);
  const users = await db.user.findMany({
    where: {
      deletedAt: null,
      ...(params.role ? { role: params.role } : {}),
      ...(params.q ? { OR: [
        { username: { contains: params.q, mode: "insensitive" } },
        { email: { contains: params.q, mode: "insensitive" } }
      ] } : {})
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return <>
    <h1 className="text-3xl font-bold">用户管理</h1>
    <p className="mt-2 text-slate-500">点击用户名或“查看详情”进入用户资料；支持选择多个账号进行安全的软删除。</p>
    <form className="my-5 flex flex-col gap-2 sm:flex-row">
      <input className="input" name="q" defaultValue={params.q} placeholder="用户名或邮箱" />
      <select className="input sm:max-w-40" name="role" defaultValue={params.role || ""}>
        <option value="">全部权限</option><option value="ADMIN">管理员</option><option value="USER">普通用户</option>
      </select>
      <button className="btn whitespace-nowrap">搜索</button>
    </form>
    <AdminUsersTable currentUserId={admin.id} users={users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      role: user.role,
      identityBadge: user.identityBadge,
      status: user.status,
      createdAt: user.createdAt.toISOString()
    }))} />
  </>;
}
