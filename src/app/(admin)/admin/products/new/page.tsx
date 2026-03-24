import { prisma } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";
import { checkPermission } from "@/lib/check-permission";

export default async function NewProductPage() {
  await checkPermission("products");
  let categories: any[] = [];
  let ceremonyEvents: any[] = [];
  try {
    [categories, ceremonyEvents] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.ceremonyEvent.findMany({ where: { isActive: true }, orderBy: { eventDate: "desc" } }),
    ]);
  } catch {
    // Database not connected yet
  }
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">新增商品</h1>
      <ProductForm categories={categories} ceremonyEvents={ceremonyEvents} />
    </div>
  );
}
