import nodemailer from "nodemailer";
import { env } from "./env";
import { getSMTPSettings } from "./settings";

async function send(to: string, subject: string, heading: string, href: string, button: string) {
  const smtp = await getSMTPSettings();
  const mailer = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    disableFileAccess: true,
    disableUrlAccess: true
  });
  await mailer.sendMail({
    from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
    to,
    subject,
    text: `${heading}\n${href}`,
    html: `<h2>${heading}</h2><p><a href="${href}">${button}</a></p><p>若按钮无效，请复制：${href}</p>`
  });
}

export const sendVerificationMail = (to: string, token: string) => send(to, "验证你的邮箱", "欢迎加入清华附中湾区学校新生Q&A", `${env().APP_URL}/verify-email/${token}`, "验证邮箱");
export const sendPasswordResetMail = (to: string, token: string) => send(to, "重置密码", "你申请了密码重置", `${env().APP_URL}/reset-password/${token}`, "重置密码");
