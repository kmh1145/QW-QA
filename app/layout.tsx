import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";

export const metadata: Metadata = { title: { default: "清华附中湾区学校新生Q&A", template: "%s｜清华附中湾区学校新生Q&A" }, description: "汇集校园经验、官方资料和 AI 检索能力，帮助新生快速找到可靠答案。", metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000") };
export const dynamic = "force-dynamic";
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem('qa-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch{}` }} /></head><body><Header /><div className="min-h-[calc(100vh-12rem)]">{children}</div><footer className="mt-16 border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800">身份自选信息不代表学校官方认证。重要事项请以学校最新通知为准。</footer></body></html>; }
