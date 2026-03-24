import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import Image from "next/image";
import { checkPermission } from "@/lib/check-permission";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  await checkPermission("users");
  const where: any = { role: "CUSTOMER" };
  if (searchParams.search) {
    where.OR = [
      { name: { contains: searchParams.search, mode: "insensitive" } },
      { phone: { contains: searchParams.search } },
      { email: { contains: searchParams.search, mode: "insensitive" } },
    ];
  }

  let users: any[] = [];
  try {
    users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        lineId: true,
        birthDate: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Database not connected yet
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">會員管理</h1>

      <form className="mb-4">
        <input
          type="text"
          name="search"
          defaultValue={searchParams.search || ""}
          placeholder="搜尋姓名、電話或 Email..."
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-72"
        />
        <button
          type="submit"
          className="ml-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm"
        >
          搜尋
        </button>
      </form>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">會員</th>
              <th className="text-left px-4 py-3">電話（帳號）</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Email</th>
              <th className="text-left px-4 py-3 hidden xl:table-cell">LINE ID</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">出生日期</th>
              <th className="text-center px-4 py-3">訂單數</th>
              <th className="text-center px-4 py-3">狀態</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">註冊時間</th>
              <th className="text-center px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  尚無會員資料
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const displayName = user.name || user.phone;
                const initials = displayName.charAt(0).toUpperCase();
                const birthDateStr = user.birthDate
                  ? new Date(user.birthDate).toLocaleDateString("zh-TW", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })
                  : "-";

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    {/* Avatar + Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-amber-100 border border-amber-200 flex-shrink-0">
                          {user.avatarUrl ? (
                            <Image
                              src={user.avatarUrl}
                              alt={displayName}
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-amber-700">
                              {initials}
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">
                          {user.name || <span className="text-gray-400">未設定</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">{user.phone}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{user.email || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 hidden xl:table-cell">{user.lineId || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{birthDateStr}</td>
                    <td className="px-4 py-3 text-center">{user._count.orders}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          user.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.isActive ? "正常" : "停用"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a
                        href={`/admin/users/${user.id}`}
                        className="text-amber-700 hover:underline text-xs"
                      >
                        編輯
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-500 mt-2">共 {users.length} 位會員</p>
    </div>
  );
}
