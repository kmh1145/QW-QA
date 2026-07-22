import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireApiUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { fail, handleError, ok } from "@/lib/api";
import { encryptSecret } from "@/lib/secrets";
import { getSettingsOverview, SETTING_KEYS, storedAISettingSchema, storedSmtpSchema } from "@/lib/settings";

const settingsSchema = z.object({
  emailVerificationEnabled: z.boolean(),
  smtp: z.object({
    host: z.string().trim().min(1).max(255),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    user: z.string().trim().max(320),
    password: z.string().max(1000),
    clearPassword: z.boolean(),
    fromName: z.string().trim().min(1).max(100),
    fromEmail: z.string().trim().email().max(320)
  }),
  ai: z.object({
    enabled: z.boolean(),
    baseUrl: z.union([z.string().trim().url(), z.literal("")]),
    apiKey: z.string().max(2000),
    clearApiKey: z.boolean(),
    chatModel: z.string().trim().min(1).max(200),
    embeddingModel: z.string().trim().min(1).max(200),
    dailyLimit: z.number().int().min(1).max(10000),
    maxContextItems: z.number().int().min(1).max(20),
    maxInputLength: z.number().int().min(100).max(10000)
  })
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireApiUser();
    if (admin.role !== "ADMIN") return fail("需要管理员权限", 403);
    const input = settingsSchema.parse(await request.json());
    const before = await getSettingsOverview();
    const existingRows = await db.siteSetting.findMany({ where: { key: { in: [SETTING_KEYS.smtp, SETTING_KEYS.ai] } } });
    const existing = new Map(existingRows.map((row) => [row.key, row.value]));
    const previousSmtp = storedSmtpSchema.safeParse(existing.get(SETTING_KEYS.smtp));
    const previousAI = storedAISettingSchema.safeParse(existing.get(SETTING_KEYS.ai));

    const smtpPasswordEncrypted = input.smtp.clearPassword
      ? ""
      : input.smtp.password
        ? encryptSecret(input.smtp.password)
        : previousSmtp.success ? previousSmtp.data.passwordEncrypted : undefined;
    const aiKeyEncrypted = input.ai.clearApiKey
      ? ""
      : input.ai.apiKey
        ? encryptSecret(input.ai.apiKey)
        : previousAI.success ? previousAI.data.apiKeyEncrypted : undefined;

    const smtpValue = {
      host: input.smtp.host,
      port: input.smtp.port,
      secure: input.smtp.secure,
      user: input.smtp.user,
      fromName: input.smtp.fromName,
      fromEmail: input.smtp.fromEmail,
      ...(smtpPasswordEncrypted !== undefined ? { passwordEncrypted: smtpPasswordEncrypted } : {})
    };
    const aiValue = {
      enabled: input.ai.enabled,
      baseUrl: input.ai.baseUrl,
      chatModel: input.ai.chatModel,
      embeddingModel: input.ai.embeddingModel,
      dailyLimit: input.ai.dailyLimit,
      maxContextItems: input.ai.maxContextItems,
      maxInputLength: input.ai.maxInputLength,
      ...(aiKeyEncrypted !== undefined ? { apiKeyEncrypted: aiKeyEncrypted } : {})
    };

    await db.$transaction([
      db.siteSetting.upsert({ where: { key: SETTING_KEYS.emailVerification }, update: { value: { enabled: input.emailVerificationEnabled } }, create: { key: SETTING_KEYS.emailVerification, value: { enabled: input.emailVerificationEnabled } } }),
      db.siteSetting.upsert({ where: { key: SETTING_KEYS.smtp }, update: { value: smtpValue as Prisma.InputJsonValue }, create: { key: SETTING_KEYS.smtp, value: smtpValue as Prisma.InputJsonValue } }),
      db.siteSetting.upsert({ where: { key: SETTING_KEYS.ai }, update: { value: aiValue as Prisma.InputJsonValue }, create: { key: SETTING_KEYS.ai, value: aiValue as Prisma.InputJsonValue } })
    ]);
    const after = await getSettingsOverview();
    await audit(admin.id, "UPDATE_SYSTEM_SETTINGS", "SiteSetting", "runtime", before, after);
    return ok(after);
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    return handleError(error);
  }
}
