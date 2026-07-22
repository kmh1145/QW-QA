import type { Metadata } from "next"; import { requireAdmin } from "@/lib/auth"; import { AdminNav } from "@/components/admin-nav";
export const metadata: Metadata={title:"管理后台",robots:{index:false,follow:false}}; export default async function Layout({children}:{children:React.ReactNode}){await requireAdmin();return <main className="container-page py-8"><AdminNav/>{children}</main>}
