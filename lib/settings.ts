import { z } from "zod";
import { db } from "./db";
import { env } from "./env";
import { decryptSecret } from "./secrets";

export const SETTING_KEYS = {
  emailVerification: "system.emailVerification",
  smtp: "system.smtp",
  ai: "system.ai"
} as const;

const emailSettingSchema = z.object({ enabled: z.boolean() });
export const storedSmtpSchema = z.object({
  host: z.string(),
  port: z.number().int().positive(),
  secure: z.boolean(),
  user: z.string(),
  fromName: z.string(),
  fromEmail: z.string(),
  passwordEncrypted: z.string().optional()
});
export const storedAISettingSchema = z.object({
  enabled: z.boolean(),
  baseUrl: z.string(),
  chatModel: z.string(),
  embeddingModel: z.string(),
  dailyLimit: z.number().int().positive(),
  maxContextItems: z.number().int().min(1).max(20),
  maxInputLength: z.number().int().min(100).max(10000),
  apiKeyEncrypted: z.string().optional()
});

async function settingValues() {
  const rows = await db.siteSetting.findMany({ where: { key: { in: Object.values(SETTING_KEYS) } } });
  return new Map(rows.map((row) => [row.key, row.value]));
}

export async function isEmailVerificationEnabled() {
  const row = await db.siteSetting.findUnique({ where: { key: SETTING_KEYS.emailVerification } });
  const stored = emailSettingSchema.safeParse(row?.value);
  return stored.success ? stored.data.enabled : env().EMAIL_VERIFICATION_ENABLED;
}

export async function getSMTPSettings() {
  const values = await settingValues();
  const stored = storedSmtpSchema.safeParse(values.get(SETTING_KEYS.smtp));
  const defaults = env();
  if (!stored.success) return {
    host: defaults.SMTP_HOST,
    port: defaults.SMTP_PORT,
    secure: defaults.SMTP_SECURE,
    user: defaults.SMTP_USER ?? "",
    password: defaults.SMTP_PASSWORD ?? "",
    fromName: defaults.SMTP_FROM_NAME,
    fromEmail: defaults.SMTP_FROM_EMAIL
  };
  return {
    host: stored.data.host,
    port: stored.data.port,
    secure: stored.data.secure,
    user: stored.data.user,
    password: stored.data.passwordEncrypted === undefined ? defaults.SMTP_PASSWORD ?? "" : decryptSecret(stored.data.passwordEncrypted),
    fromName: stored.data.fromName,
    fromEmail: stored.data.fromEmail
  };
}

export async function getAISettings() {
  const values = await settingValues();
  const stored = storedAISettingSchema.safeParse(values.get(SETTING_KEYS.ai));
  const defaults = env();
  if (!stored.success) return {
    enabled: defaults.AI_ENABLED,
    baseUrl: defaults.OPENAI_BASE_URL ?? "",
    apiKey: defaults.OPENAI_API_KEY ?? "",
    chatModel: defaults.OPENAI_CHAT_MODEL,
    embeddingModel: defaults.OPENAI_EMBEDDING_MODEL,
    dailyLimit: defaults.AI_DAILY_LIMIT_PER_USER,
    maxContextItems: defaults.AI_MAX_CONTEXT_ITEMS,
    maxInputLength: defaults.AI_MAX_INPUT_LENGTH
  };
  return {
    enabled: stored.data.enabled,
    baseUrl: stored.data.baseUrl,
    apiKey: stored.data.apiKeyEncrypted === undefined ? defaults.OPENAI_API_KEY ?? "" : decryptSecret(stored.data.apiKeyEncrypted),
    chatModel: stored.data.chatModel,
    embeddingModel: stored.data.embeddingModel,
    dailyLimit: stored.data.dailyLimit,
    maxContextItems: stored.data.maxContextItems,
    maxInputLength: stored.data.maxInputLength
  };
}

export async function getSettingsOverview() {
  const [emailVerificationEnabled, smtp, ai] = await Promise.all([
    isEmailVerificationEnabled(),
    getSMTPSettings(),
    getAISettings()
  ]);
  return {
    emailVerificationEnabled,
    smtp: {
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      user: smtp.user,
      fromName: smtp.fromName,
      fromEmail: smtp.fromEmail,
      passwordConfigured: Boolean(smtp.password)
    },
    ai: {
      enabled: ai.enabled,
      baseUrl: ai.baseUrl,
      chatModel: ai.chatModel,
      embeddingModel: ai.embeddingModel,
      dailyLimit: ai.dailyLimit,
      maxContextItems: ai.maxContextItems,
      maxInputLength: ai.maxInputLength,
      apiKeyConfigured: Boolean(ai.apiKey)
    }
  };
}
