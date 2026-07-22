import { z } from "zod";

const reserved = /^(管理员|校长|官方|学校官方|教务处|admin|administrator)$/iu;
export const usernameSchema = z.string().trim().min(3, "用户名至少 3 个字符").max(20, "用户名最多 20 个字符")
  .regex(/^[\p{Script=Han}A-Za-z0-9_]+$/u, "只能使用中文、字母、数字和下划线")
  .refine((value) => !reserved.test(value), "该用户名可能造成官方身份混淆");
export const emailSchema = z.string().trim().email("邮箱格式不正确").max(320).transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(8, "密码至少 8 位").max(128).regex(/[A-Za-z]/, "密码必须包含字母").regex(/\d/, "密码必须包含数字");
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: "请同意用户协议和隐私政策" }) })
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "两次输入的密码不一致" });
export const loginSchema = z.object({ identifier: z.string().trim().min(1), password: z.string().min(1), remember: z.boolean().optional() });
export const questionSchema = z.object({ title: z.string().trim().min(8).max(150), content: z.string().trim().min(20).max(30000), categoryId: z.string().min(1), tagIds: z.array(z.string()).max(5).default([]), draft: z.boolean().default(false) });
export const answerSchema = z.object({ content: z.string().trim().min(2).max(30000) });
export const selfIdentitySchema = z.enum(["NONE", "GRADE_1", "GRADE_2", "GRADE_3", "ALUMNI"]);
export const avatarUrlSchema = z.string().trim().max(1000).refine((value) => {
  if (!value || value.startsWith("/")) return true;
  try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
}, "头像地址必须是有效的 HTTP(S) 链接或站内路径");
export const profileSchema = z.object({ username: usernameSchema, bio: z.string().trim().max(500), avatarUrl: avatarUrlSchema });

export function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
export function hasSensitivePersonalInfo(value: string) {
  return /(?:1[3-9]\d{9}|\d{17}[\dXx]|(?:学号|身份证|住址|床位)\s*[:：]?\s*[\w\-]{4,})/.test(value);
}
