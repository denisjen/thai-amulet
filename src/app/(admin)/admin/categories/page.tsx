import { prisma } from "@/lib/db";
import CategoryManager from "@/components/admin/CategoryManager";
import { checkPermission } from "@/lib/check-permission";

export default async function AdminCategoriesPage() {
  await checkPermission("categories");
  let categories: any[] = [];
  try {
    categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  } catch {
    // Database not connected yet
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">分類管理</h1>
      <CategoryManager categories={categories} />
    </div>
  );
}
