import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { checkPermission } from "@/lib/check-permission";

export default async function AdminDashboard() {
  await checkPermission("dashboard");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalOrders = 0, todayOrders = 0, pendingOrders = 0, totalUsers = 0, totalProducts = 0;
  let totalRevenue: any = { _sum: { totalAmount: null } };
  let todayRevenue: any = { _sum: { totalAmount: null } };
  let recentOrders: any[] = [];

  try {
    [
      totalOrders,
      todayOrders,
      pendingOrders,
      totalRevenue,
      todayRevenue,
      totalUsers,
      totalProducts,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.aggregate({
        where: { paymentStatus: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { paymentStatus: "PAID", createdAt: { gte: today } },
        _sum: { totalAmount: true },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, phone: true } },
          items: { take: 1 },
        },
      }),
    ]);
  } catch {
    // Database not connected yet
  }

  const statCards = [
    {
      label: "今日訂單",
      value: todayOrders,
      sub: `共 ${totalOrders} 筆`,
      color: "bg-blue-50 text-blue-800",
    },
    {
      label: "待處理",
      value: pendingOrders,
      sub: "待確認訂單",
      color: "bg-yellow-50 text-yellow-800",
    },
    {
      label: "今日營收",
      value: formatCurrency(Number(todayRevenue._sum.totalAmount || 0)),
      sub: `累計 ${formatCurrency(Number(totalRevenue._sum.totalAmount || 0))}`,
      color: "bg-green-50 text-green-800",
    },
    {
      label: "會員總數",
      value: totalUsers,
      sub: `${totalProducts} 項商品`,
      color: "bg-purple-50 text-purple-800",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">儀表板</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className={`rounded-xl p-4 ${card.color}`}>
            <p className="text-sm font-medium opacity-75">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
            <p className="text-xs opacity-60 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold">最新訂單</h2>
          <Link href="/admin/orders" className="text-amber-700 text-sm hover:underline">
            查看全部 →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-left pb-2">訂單編號</th>
              <th className="text-left pb-2">會員</th>
              <th className="text-left pb-2">商品</th>
              <th className="text-right pb-2">金額</th>
              <th className="text-right pb-2">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recentOrders.map((order) => (
              <tr key={order.id}>
                <td className="py-2">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-amber-700 hover:underline font-medium"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="py-2 text-gray-600">
                  {order.user?.name || order.user?.phone || "-"}
                </td>
                <td className="py-2 text-gray-600">{order.items[0]?.name}</td>
                <td className="py-2 text-right font-medium">
                  {formatCurrency(Number(order.totalAmount))}
                </td>
                <td className="py-2 text-right">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      order.paymentStatus === "PAID"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {order.paymentStatus === "PAID" ? "已付款" : "待付款"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
