import { getSettingsOverview } from "@/lib/settings";
import { SystemSettingsForm } from "@/components/system-settings-form";

export default async function SettingsAdminPage() {
  const settings = await getSettingsOverview();
  return <>
    <h1 className="text-3xl font-bold">系统设置</h1>
    <p className="mt-2 text-slate-500">配置邮箱验证、第三方 SMTP 服务商和兼容 OpenAI 的 AI 服务。</p>
    <SystemSettingsForm settings={settings} />
  </>;
}
