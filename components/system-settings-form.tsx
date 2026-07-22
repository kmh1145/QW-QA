"use client";

import { useState } from "react";

type SettingsOverview = {
  emailVerificationEnabled: boolean;
  smtp: { host: string; port: number; secure: boolean; user: string; fromName: string; fromEmail: string; passwordConfigured: boolean };
  ai: { enabled: boolean; baseUrl: string; chatModel: string; embeddingModel: string; dailyLimit: number; maxContextItems: number; maxInputLength: number; apiKeyConfigured: boolean };
};

export function SystemSettingsForm({ settings }: { settings: SettingsOverview }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setMessage("");
    setError("");
    const form = new FormData(formElement);
    const response = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailVerificationEnabled: form.get("emailVerificationEnabled") === "on",
        smtp: {
          host: form.get("smtpHost"),
          port: Number(form.get("smtpPort")),
          secure: form.get("smtpSecure") === "on",
          user: form.get("smtpUser"),
          password: form.get("smtpPassword"),
          clearPassword: form.get("clearSmtpPassword") === "on",
          fromName: form.get("smtpFromName"),
          fromEmail: form.get("smtpFromEmail")
        },
        ai: {
          enabled: form.get("aiEnabled") === "on",
          baseUrl: form.get("aiBaseUrl"),
          apiKey: form.get("aiApiKey"),
          clearApiKey: form.get("clearAiApiKey") === "on",
          chatModel: form.get("aiChatModel"),
          embeddingModel: form.get("aiEmbeddingModel"),
          dailyLimit: Number(form.get("aiDailyLimit")),
          maxContextItems: Number(form.get("aiMaxContextItems")),
          maxInputLength: Number(form.get("aiMaxInputLength"))
        }
      })
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setError(body.error?.message ?? "设置保存失败");
    setMessage("系统设置已保存并立即生效。密钥没有回显到浏览器。 ");
    (formElement.elements.namedItem("smtpPassword") as HTMLInputElement).value = "";
    (formElement.elements.namedItem("aiApiKey") as HTMLInputElement).value = "";
  }

  return <form onSubmit={submit} className="mt-6 space-y-6">
    <section className="card">
      <h2 className="text-xl font-bold">账号与邮箱验证</h2>
      <label className="choice-label mt-4"><input name="emailVerificationEnabled" type="checkbox" defaultChecked={settings.emailVerificationEnabled} />开启注册邮箱验证</label>
      <p className="mt-2 text-sm text-slate-500">关闭后新注册用户会直接视为已验证，现有未验证用户也可以登录和使用核心功能。生产环境建议保持开启。</p>
    </section>

    <section className="card" id="smtp">
      <h2 className="text-xl font-bold">SMTP 服务商配置</h2>
      <p className="mt-2 text-sm text-slate-500">填写邮件服务商提供的 SMTP 参数；系统通过服务商投递，不在服务器上自行搭建邮件发送服务。</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label><span className="label">SMTP 主机</span><input className="input" name="smtpHost" defaultValue={settings.smtp.host} required /></label>
        <label><span className="label">端口</span><input className="input" name="smtpPort" type="number" min={1} max={65535} defaultValue={settings.smtp.port} required /></label>
        <label><span className="label">用户名</span><input className="input" name="smtpUser" defaultValue={settings.smtp.user} autoComplete="off" /></label>
        <label><span className="label">密码/授权码</span><input className="input" name="smtpPassword" type="password" autoComplete="new-password" placeholder={settings.smtp.passwordConfigured ? "已配置；留空保持不变" : "尚未配置"} /></label>
        <label><span className="label">发件人名称</span><input className="input" name="smtpFromName" defaultValue={settings.smtp.fromName} required /></label>
        <label><span className="label">发件邮箱</span><input className="input" name="smtpFromEmail" type="email" defaultValue={settings.smtp.fromEmail} required /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-5">
        <label className="choice-label"><input name="smtpSecure" type="checkbox" defaultChecked={settings.smtp.secure} />使用直接 TLS（通常为 465 端口）</label>
        <label className="choice-label"><input name="clearSmtpPassword" type="checkbox" />清除已保存的 SMTP 密码</label>
      </div>
    </section>

    <section className="card" id="ai">
      <h2 className="text-xl font-bold">AI 配置</h2>
      <div className="mt-4"><label className="choice-label"><input name="aiEnabled" type="checkbox" defaultChecked={settings.ai.enabled} />开启 AI 助手</label></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="label">兼容 OpenAI API 地址</span><input className="input" name="aiBaseUrl" type="url" defaultValue={settings.ai.baseUrl} placeholder="https://api.openai.com/v1" /></label>
        <label><span className="label">API Key</span><input className="input" name="aiApiKey" type="password" autoComplete="new-password" placeholder={settings.ai.apiKeyConfigured ? "已配置；留空保持不变" : "尚未配置"} /></label>
        <label><span className="label">聊天模型</span><input className="input" name="aiChatModel" defaultValue={settings.ai.chatModel} required /></label>
        <label><span className="label">Embedding 模型</span><input className="input" name="aiEmbeddingModel" defaultValue={settings.ai.embeddingModel} required /></label>
        <label><span className="label">单用户每日次数</span><input className="input" name="aiDailyLimit" type="number" min={1} max={10000} defaultValue={settings.ai.dailyLimit} required /></label>
        <label><span className="label">检索资料数量</span><input className="input" name="aiMaxContextItems" type="number" min={1} max={20} defaultValue={settings.ai.maxContextItems} required /></label>
        <label><span className="label">最大输入长度</span><input className="input" name="aiMaxInputLength" type="number" min={100} max={10000} defaultValue={settings.ai.maxInputLength} required /></label>
      </div>
      <label className="choice-label mt-4"><input name="clearAiApiKey" type="checkbox" />清除已保存的 API Key</label>
      <p className="mt-3 text-xs text-slate-500">SMTP 密码和 API Key 使用服务端加密后保存，页面只显示是否已配置，不返回密钥内容。</p>
    </section>

    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800 dark:bg-brand-950 dark:text-brand-200">{message}</p>}
    <button className="btn w-full sm:w-auto" disabled={busy}>{busy ? "保存中…" : "保存系统设置"}</button>
  </form>;
}
