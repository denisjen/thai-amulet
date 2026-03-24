import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { checkPermission } from "@/lib/check-permission";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  await checkPermission("products");
  let product: any = null;
  let categories: any[] = [];
  let ceremonyEvents: any[] = [];
  try {
    [product, categories, ceremonyEvents] = await Promise.all([
      prisma.product.findUnique({ where: { id: params.id } }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.ceremonyEvent.findMany({ where: { isActive: true }, orderBy: { eventDate: "desc" } }),
    ]);
    if (product) {
      // 補讀 Prisma client 尚未支援的新欄位
      const sv: any[] = await prisma.$queryRaw`
        SELECT specialVersionEnabled, specialVersionSurcharge, specialVersionLabel
        FROM \`Product\` WHERE id = ${params.id}
      `;
      if (sv[0]) Object.assign(product, sv[0]);
    }
  } catch {
    // Database not connected yet
  }

  if (!product) notFound();

  // Serialize Decimal fields before passing to client component
  const serializedProduct = {
    ...product,
    price: Number(product.price),
    specialVersionSurcharge: Number(product.specialVersionSurcharge ?? 0),
    specialVersionEnabled: Boolean(product.specialVersionEnabled),
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">編輯商品</h1>
      <ProductForm product={serializedProduct} categories={categories} ceremonyEvents={ceremonyEvents} />
    </div>
  );
}
