import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import DiscountManager from "@/components/admin/DiscountManager";
import { checkPermission } from "@/lib/check-permission";

export default async function AdminDiscountsPage() {
  await checkPermission("discounts");
  let discounts: any[] = [];
  try {
    discounts = await prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Database not connected yet
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">折扣碼管理</h1>
      <DiscountManager discounts={discounts} />
    </div>
  );
}
