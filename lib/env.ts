import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SMTP_HOST: z.string().default("mailpit"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z.string().default("false").transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM_NAME: z.string().default("清华附中湾区学校新生Q&A"),
  SMTP_FROM_EMAIL: z.string().email().default("no-reply@example.edu.cn"),
  EMAIL_VERIFICATION_ENABLED: z.string().default("true").transform((v) => v === "true"),
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  EMAIL_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  AI_ENABLED: z.string().default("false").transform((v) => v === "true"),
  OPENAI_BASE_URL: z.string().url().optional().or(z.literal("")),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  AI_DAILY_LIMIT_PER_USER: z.coerce.number().int().positive().default(30),
  AI_MAX_CONTEXT_ITEMS: z.coerce.number().int().min(1).max(20).default(8),
  AI_MAX_INPUT_LENGTH: z.coerce.number().int().min(100).max(10000).default(2000),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(10)
});

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;
export function env(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}
