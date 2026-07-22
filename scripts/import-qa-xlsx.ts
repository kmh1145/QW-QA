import crypto from "node:crypto";
import fs from "node:fs/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/security";

type ImportAnswer = { column: number; content: string };
type ImportQuestion = {
  source: { sheet: string; row: number };
  title: string;
  categorySlug: string;
  answers: ImportAnswer[];
};
type ImportPayload = {
  formatVersion: number;
  sourceFile: string;
  sourceSha256: string;
  questions: ImportQuestion[];
};

const db = new PrismaClient();
const migrationUserId = "spreadsheet-migration-user";
const migrationEmail = "spreadsheet-migration@local.invalid";
const migrationUsername = "表格迁移用户";
const migrationTagSlug = "historical-qa";

function stableId(prefix: string, value: string) {
  return `${prefix}-${crypto.createHash("sha256").update(value).digest("hex").slice(0, 24)}`;
}

function questionId(question: ImportQuestion) {
  return stableId("xlsx-q", `${question.source.sheet}:${question.source.row}`);
}

function answerId(question: ImportQuestion, answer: ImportAnswer) {
  return stableId("xlsx-a", `${question.source.sheet}:${question.source.row}:${answer.column}`);
}

async function loadPayload(): Promise<ImportPayload> {
  const fileUrl = new URL("../data/imports/qa-spreadsheet.json", import.meta.url);
  const payload = JSON.parse(await fs.readFile(fileUrl, "utf8")) as ImportPayload;
  if (payload.formatVersion !== 1 || !Array.isArray(payload.questions)) throw new Error("不支持的迁移数据格式");
  const sourceKeys = payload.questions.map((question) => `${question.source.sheet}:${question.source.row}`);
  if (new Set(sourceKeys).size !== sourceKeys.length) throw new Error("迁移数据包含重复来源行");
  if (payload.questions.some((question) => !question.title || question.title.length > 150)) throw new Error("迁移数据包含无效问题标题");
  return payload;
}

async function ensureMigrationUser() {
  const existing = await db.user.findUnique({ where: { email: migrationEmail } });
  if (existing) return existing;
  return db.user.create({
    data: {
      id: migrationUserId,
      username: migrationUsername,
      email: migrationEmail,
      emailVerifiedAt: new Date(),
      passwordHash: await hashPassword(crypto.randomBytes(48).toString("base64url")),
      status: "DISABLED",
      bio: "用于导入历史问答表格的只读账号。内容来自往届学生经验，不代表学校官方规定。"
    }
  });
}

async function importQuestion(
  transaction: Prisma.TransactionClient,
  question: ImportQuestion,
  categoryId: string,
  userId: string,
  tagId: string
) {
  const id = questionId(question);
  const sourceLabel = `${question.source.sheet}!${question.source.row}`;
  const content = `> 本问题由历史问答表格迁移，原提问者和发布时间未记录。以下内容仅代表学生经验，不是学校官方规定；时间、制度等信息可能已经变化，请以学校最新通知为准。\n\n来源位置：${sourceLabel}`;
  await transaction.question.upsert({
    where: { id },
    create: { id, title: question.title, slug: id, content, authorId: userId, categoryId, status: "PUBLISHED" },
    update: { title: question.title, content, categoryId, status: "PUBLISHED", deletedAt: null }
  });
  await transaction.questionTag.upsert({ where: { questionId_tagId: { questionId: id, tagId } }, create: { questionId: id, tagId }, update: {} });
  const expectedAnswerIds = question.answers.map((answer) => answerId(question, answer));
  await transaction.answer.updateMany({ where: { questionId: id, authorId: userId, id: { notIn: expectedAnswerIds } }, data: { status: "DELETED", deletedAt: new Date(), isOfficial: false } });
  for (const answer of question.answers) {
    const importedContent = `> 历史问答表格迁移内容；原回答者和发布时间未记录，仅供经验参考。\n\n${answer.content}`;
    const idForAnswer = answerId(question, answer);
    await transaction.answer.upsert({
      where: { id: idForAnswer },
      create: { id: idForAnswer, questionId: id, authorId: userId, content: importedContent, status: "PUBLISHED" },
      update: { content: importedContent, status: "PUBLISHED", deletedAt: null, isOfficial: false }
    });
  }
  return id;
}

async function main() {
  const payload = await loadPayload();
  const answerCount = payload.questions.reduce((sum, question) => sum + question.answers.length, 0);
  const categorySummary = payload.questions.reduce<Record<string, number>>((summary, question) => ({ ...summary, [question.categorySlug]: (summary[question.categorySlug] ?? 0) + 1 }), {});
  const preview = { sourceFile: payload.sourceFile, sourceSha256: payload.sourceSha256, questions: payload.questions.length, answers: answerCount, categories: categorySummary };
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "preview", ...preview }, null, 2));
    console.log("确认无误后使用 npm run data:import-xlsx -- --apply 执行迁移。");
    return;
  }

  const migrationUser = await ensureMigrationUser();
  const [categories, tag] = await Promise.all([
    db.category.findMany({ select: { id: true, slug: true } }),
    db.tag.upsert({ where: { slug: migrationTagSlug }, create: { name: "历史问答", slug: migrationTagSlug }, update: { isActive: true } })
  ]);
  const categoryIds = new Map(categories.map((category) => [category.slug, category.id]));
  const fallbackCategoryId = categoryIds.get("other");
  if (!fallbackCategoryId) throw new Error("缺少“其他问题”分类，请先运行 Seed");

  const importedIds: string[] = [];
  for (const question of payload.questions) {
    const id = await db.$transaction(
      (transaction) => importQuestion(transaction, question, categoryIds.get(question.categorySlug) ?? fallbackCategoryId, migrationUser.id, tag.id),
      { timeout: 30_000 }
    );
    importedIds.push(id);
  }
  const archived = await db.question.updateMany({
    where: { authorId: migrationUser.id, id: { startsWith: "xlsx-q-", notIn: importedIds } },
    data: { status: "DELETED", deletedAt: new Date() }
  });
  const operator = await db.user.findFirst({ where: { role: "ADMIN", deletedAt: null }, orderBy: { createdAt: "asc" } }) ?? migrationUser;
  await db.auditLog.create({
    data: {
      operatorId: operator.id,
      action: "IMPORT_SPREADSHEET_QA",
      targetType: "Spreadsheet",
      targetId: payload.sourceSha256.slice(0, 24),
      afterData: { questions: payload.questions.length, answers: answerCount, archivedQuestions: archived.count, migrationUserId: migrationUser.id, sourceFile: payload.sourceFile }
    }
  });
  console.log(JSON.stringify({ mode: "applied", ...preview, archivedQuestions: archived.count, migrationUser: migrationUser.username }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "迁移失败");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
