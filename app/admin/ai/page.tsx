import Link from "next/link";
import { getSettingsOverview } from "@/lib/settings";

export default async function AIAdminPage() {
  const { ai } = await getSettingsOverview();
  return <>
    <h1 className="text-3xl font-bold">AI 设置</h1>
    <section className="card mt-5 space-y-3">
      <p>状态：<b>{ai.enabled ? "已启用" : "未启用"}</b></p>
      <p>API Key：{ai.apiKeyConfigured ? "已安全配置" : "未配置"}</p>
      <p>聊天模型：{ai.chatModel}</p>
      <p>Embedding 模型：{ai.embeddingModel}</p>
      <p>单用户每日上限：{ai.dailyLimit}</p>
      <p>检索数量：{ai.maxContextItems}</p>
      <Link className="btn mt-3" href="/admin/settings#ai">进入系统设置修改 AI 配置</Link>
    </section>
  </>;
}
