import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { z } from "zod";

const input = z.object({ INITIAL_ADMIN_EMAIL: z.string().email(), INITIAL_ADMIN_USERNAME: z.string().min(3).max(20), INITIAL_ADMIN_PASSWORD: z.string().min(12).regex(/[A-Za-z]/).regex(/\d/) }).parse(process.env);
const db = new PrismaClient();
try {
  const email = input.INITIAL_ADMIN_EMAIL.trim().toLowerCase();
  const existing = await db.user.findFirst({ where: { OR: [{ email }, { username: input.INITIAL_ADMIN_USERNAME }] } });
  if (existing) {
    if (existing.role !== "ADMIN") await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    console.log(`管理员已存在或已授予权限：${existing.username}`);
  } else {
    const passwordHash = await hash(input.INITIAL_ADMIN_PASSWORD, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const user = await db.user.create({ data: { email, username: input.INITIAL_ADMIN_USERNAME, passwordHash, role: "ADMIN", emailVerifiedAt: new Date(), mustChangePassword: true } });
    console.log(`初始管理员已创建：${user.username}。首次登录后请立即修改密码。`);
  }
} finally { await db.$disconnect(); }
