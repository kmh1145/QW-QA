import Link from "next/link";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/security";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await db.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  let title = "验证链接无效"; let detail = "链接不存在或已失效，请重新发送验证邮件。";
  if (record?.usedAt || record?.user.emailVerifiedAt) { title = "邮箱已经验证"; detail = "无需重复验证，现在可以登录。"; }
  else if (record && record.expiresAt >= new Date()) {
    const verified = await db.$transaction(async (tx) => {
      const claimed = await tx.emailVerificationToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gte: new Date() } }, data: { usedAt: new Date() } });
      if (claimed.count !== 1) return false;
      await tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
      return true;
    });
    title = verified ? "邮箱验证成功" : "邮箱已经验证"; detail = verified ? "你的邮箱已验证，现在可以登录并使用全部功能。" : "无需重复验证，现在可以登录。";
  }
  return <main className="mx-auto max-w-lg py-20 text-center"><h1 className="text-3xl font-bold">{title}</h1><p className="mt-4 text-slate-600">{detail}</p><Link className="btn mt-8 inline-flex" href="/login">前往登录</Link></main>;
}
