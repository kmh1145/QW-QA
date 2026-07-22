import { db } from "@/lib/db";
import { CategoryManager } from "@/components/category-manager";

export default async function CategoriesAdminPage() {
  const categories = await db.category.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  return <>
    <h1 className="text-3xl font-bold">分类管理</h1>
    <p className="mt-2 text-slate-500">默认分类会保留为初始配置；管理员可以新增、调整顺序、停用或删除空分类。</p>
    <CategoryManager categories={categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      questionCount: category._count.questions
    }))} />
  </>;
}
