import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDateTime, formatDate } from "@/lib/utils";
import Link from "next/link";
import AdminUserEditForm from "@/components/admin/AdminUserEditForm";
import DeleteUserButton from "@/components/admin/DeleteUserButton";
import { checkPermission } from "@/lib/check-permission";

export default async function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await checkPermission("users");
  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        lineId: true,
        birthDate: true,
        birthTime: true,
        avatarUrl: true,
        isActive: true,
        googleId: true,
        createdAt: true,
        _count: { select: { orders: true } },
        addresses: {
          select: {
            id: true,
            name: true,
            phone: true,
            postalCode: true,
            city: true,
            address: true,
            isDefault: true,
          },
          orderBy: [{ isDefault: "desc" }],
        },
      },
    });
  } catch {}

  if (!user) notFound();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">會員詳情</h1>
        <Link href="/admin/users" className="text-amber-700 text-sm hover:underline">
          ← 返回列表
        </Link>
      </div>

      <div className="space-y-5">
        {/* Info card */}
        <div className="bg-white rounded-xl border p-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">註冊時間</p>
            <p>{formatDateTime(user.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">訂單數</p>
            {user._count.orders > 0 ? (
              <Link
                href={`/admin/orders?userId=${user.id}`}
                className="text-amber-700 hover:underline font-medium"
              >
                {user._count.orders} 筆 →
              </Link>
            ) : (
              <p>0 筆</p>
            )}
          </div>
          {user.birthDate && (
            <div>
              <p className="text-gray-500">出生日期</p>
              <p>{formatDate(user.birthDate)}</p>
            </div>
          )}
          {user.birthTime && (
            <div>
              <p className="text-gray-500">出生時間</p>
              <p>{user.birthTime}</p>
            </div>
          )}
          {user.googleId && (
            <div>
              <p className="text-gray-500">登入方式</p>
              <p className="text-blue-600">Google 帳號</p>
            </div>
          )}
          {user.lineId && (
            <div>
              <p className="text-gray-500">LINE ID</p>
              <p>{user.lineId}</p>
            </div>
          )}
        </div>

        {/* Address list */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-bold mb-4">收件地址名單</h2>
          {user.addresses.length === 0 ? (
            <p className="text-sm text-gray-400">尚未儲存任何地址</p>
          ) : (
            <div className="space-y-3">
              {user.addresses.map((addr: any) => (
                <div
                  key={addr.id}
                  className={`border rounded-xl p-4 relative text-sm ${
                    addr.isDefault ? "border-amber-400 bg-amber-50" : "border-gray-200"
                  }`}
                >
                  {addr.isDefault && (
                    <span className="absolute top-3 right-3 text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full">
                      預設
                    </span>
                  )}
                  <p className="font-medium text-gray-900">
                    {addr.name}
                    <span className="ml-2 text-gray-500 font-normal">{addr.phone}</span>
                  </p>
                  <p className="text-gray-600 mt-0.5">
                    {[addr.postalCode, addr.city, addr.address].filter(Boolean).join(" ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit form */}
        <AdminUserEditForm user={user} />

        {/* Delete */}
        <div className="bg-white rounded-xl border border-red-100 p-5">
          <h2 className="font-bold text-sm text-red-700 mb-3">危險操作</h2>
          <DeleteUserButton
            userId={user.id}
            userName={user.name || user.phone || user.email || user.id}
            orderCount={user._count.orders}
          />
        </div>
      </div>
    </div>
  );
}
