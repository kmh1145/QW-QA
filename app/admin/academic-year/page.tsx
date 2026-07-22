import { db } from "@/lib/db";
import { AcademicYearSettings } from "@/components/academic-year-settings";
import { PromotionTool } from "@/components/promotion-tool";

function dateInputValue(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export default async function AcademicYearPage() {
  const year = await db.academicYear.findFirst({ where: { isCurrent: true } });
  return <>
    <h1 className="text-3xl font-bold">学年管理</h1>
    <p className="mt-2 text-slate-500">维护学校校历周期，并在确认预览后执行年级升级。</p>
    {year ? <AcademicYearSettings year={{
      name: year.name,
      startsAt: dateInputValue(year.startsAt),
      endsAt: dateInputValue(year.endsAt),
      allowIdentityChange: year.allowIdentityChange,
      cooldownDays: year.cooldownDays,
      showSelfSelectedNotice: year.showSelfSelectedNotice
    }} /> : <div className="card my-5 text-slate-500">尚未设置当前学年，请通过初始化脚本创建。</div>}
    <PromotionTool />
  </>;
}
