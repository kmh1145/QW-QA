import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/security";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const record = await db.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  let title = "验证链接无效";
  let detail = "链接不存在或已失效，请重新发送验证邮件。";
  const changingEmail = Boolean(record?.pendingEmail);

  if (record?.usedAt) {
    title = changingEmail ? "邮箱更换链接已使用" : "邮箱已经验证";
    detail = changingEmail ? "该链接不能重复使用，请登录后重新申请。" : "无需重复验证，现在可以登录。";
  } else if (record && !changingEmail && record.user.emailVerifiedAt) {
    title = "邮箱已经验证";
    detail = "无需重复验证，现在可以登录。";
  } else if (record && record.expiresAt >= new Date()) {
    try {
      const verified = await db.$transaction(async (transaction) => {
        const claimed = await transaction.emailVerificationToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gte: new Date() } }, data: { usedAt: new Date() } });
        if (claimed.count !== 1) return false;
        if (record.pendingEmail) {
          await transaction.user.update({ where: { id: record.userId }, data: { email: record.pendingEmail, emailVerifiedAt: new Date(), sessionVersion: { increment: 1 } } });
          await transaction.session.deleteMany({ where: { userId: record.userId } });
        } else {
          await transaction.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
        }
        return true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      title = verified ? (changingEmail ? "邮箱更换成功" : "邮箱验证成功") : "链接已经使用";
      detail = verified
        ? (changingEmail ? "新邮箱已经生效，为保护账号安全，请重新登录。" : "你的邮箱已验证，现在可以登录并使用全部功能。")
        : "该链接不能重复使用。";
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        title = "无法更换邮箱";
        detail = "该邮箱已经被其他账号使用，请返回账号设置选择其他邮箱。";
      } else throw error;
    }
  }

  return <main className="mx-auto max-w-lg py-20 text-center"><h1 className="text-3xl font-bold">{title}</h1><p className="mt-4 text-slate-600">{detail}</p><Link className="btn mt-8 inline-flex" href="/login">前往登录</Link></main>;
}
