import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const db = new PrismaClient();
const categories = [
  ["入学报到","enrollment"],["宿舍生活","dormitory"],["食堂与校园卡","canteen-card"],["校规校纪","rules"],["课程学习","courses"],
  ["选科指导","course-selection"],["社团活动","clubs"],["校园设施","facilities"],["学习经验","study-experience"],["其他问题","other"]
] as const;

async function main() {
  for (const [sortOrder, [name, slug]] of categories.entries()) await db.category.upsert({ where: { slug }, update: { name, sortOrder }, create: { name, slug, sortOrder, description: `${name}相关问题` } });
  for (const [name, slug] of [["新生必读","new-student"],["官方信息","official"],["经验分享","experience"],["2026级","class-2026"]]) await db.tag.upsert({ where: { slug }, update: { name }, create: { name, slug } });
  await db.academicYear.upsert({ where: { name: "2026—2027学年" }, update: { isCurrent: true, endsAt: new Date("2027-08-31T23:59:59+08:00") }, create: { name: "2026—2027学年", startsAt: new Date("2026-09-01T00:00:00+08:00"), endsAt: new Date("2027-08-31T23:59:59+08:00"), isCurrent: true, cooldownDays: 30 } });
  await db.siteSetting.upsert({ where: { key: "identity.selfSelectedNotice" }, update: { value: "该身份由用户自行选择，不代表学校官方认证。" }, create: { key: "identity.selfSelectedNotice", value: "该身份由用户自行选择，不代表学校官方认证。" } });
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase(); const username = process.env.INITIAL_ADMIN_USERNAME; const password = process.env.INITIAL_ADMIN_PASSWORD;
  let admin = email ? await db.user.findUnique({ where: { email } }) : null;
  if (!admin && email && username && password) admin = await db.user.create({ data: { email, username, passwordHash: await hash(password, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 }), emailVerifiedAt: new Date(), role: "ADMIN", mustChangePassword: true } });
  if (admin && process.env.SEED_EXAMPLES !== "false") {
    await db.announcement.upsert({ where: { id: "seed-announcement-welcome" }, update: {}, create: { id: "seed-announcement-welcome", title: "【测试数据】欢迎使用新生 Q&A", summary: "这是 Seed 创建的示例公告，生产环境请删除或设置 SEED_EXAMPLES=false。", content: "本公告为**测试数据**，用于展示公告页面。重要事项请以学校正式通知为准。", authorId: admin.id, isPinned: true } });
    await db.knowledgeDocument.upsert({ where: { id: "seed-faq-search-first" }, update: {}, create: { id: "seed-faq-search-first", title: "【测试 FAQ】提问前应该做什么？", category: "FAQ", source: "系统示例数据", content: "提问前请先搜索已有问题，并检查信息来源与更新时间。不要公开手机号、学号、家庭住址等个人信息。", status: "READY", uploadedById: admin.id, chunks: { create: [{ chunkIndex: 0, content: "提问前请先搜索已有问题，并检查信息来源与更新时间。不要公开手机号、学号、家庭住址等个人信息。" }] } } });
    const category = await db.category.findUniqueOrThrow({ where: { slug: "enrollment" } });
    const q = await db.question.upsert({ where: { slug: "seed-new-student-question" }, update: {}, create: { title: "【测试问题】新生如何使用这个问答社区？", slug: "seed-new-student-question", content: "这是用于演示的测试问题。请先搜索，再发布问题，并注意保护个人隐私。", authorId: admin.id, categoryId: category.id, isSolved: true } });
    const answer = await db.answer.upsert({ where: { id: "seed-answer-welcome" }, update: {}, create: { id: "seed-answer-welcome", questionId: q.id, authorId: admin.id, content: "先使用首页搜索框；没有可靠答案时再发布新问题。重要事项需要向班主任或相关部门确认。", isOfficial: true } });
    await db.question.update({ where: { id: q.id }, data: { acceptedAnswerId: answer.id } });
  }
}
main().finally(() => db.$disconnect());
