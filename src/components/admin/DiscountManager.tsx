"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface Discount {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: any;
  minAmount: any;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
  discountAmount: number;
  status: string;
  paymentStatus: string;
  user: { name: string | null };
  items: { name: string; quantity: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "待確認", CONFIRMED: "已確認", PROCESSING: "處理中",
  SHIPPED: "已出貨", DELIVERED: "已送達", CANCELLED: "已取消",
};
const PAY_LABELS: Record<string, string> = {
  PENDING: "待付款", PAID: "已付款", FAILED: "失敗", REFUNDED: "退款",
};
const PAY_COLORS: Record<string, string> = {
  PENDING: "text-yellow-600", PAID: "text-green-600", FAILED: "text-red-600", REFUNDED: "text-gray-500",
};

const emptyForm = {
  code: "", description: "", type: "PERCENTAGE", value: "",
  minAmount: "", maxUses: "", expiresAt: "", isActive: true,
};

export default function DiscountManager({ discounts }: { discounts: Discount[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  // 展開訂單
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ordersMap, setOrdersMap] = useState<Record<string, OrderRow[]>>({});
  const [ordersLoading, setOrdersLoading] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        value: parseFloat(form.value),
        minAmount: form.minAmount ? parseFloat(form.minAmount) : undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("折扣碼已建立");
      setForm(emptyForm);
      setShowForm(false);
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error || "建立失敗");
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch(`/api/discounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    if (res.ok) router.refresh();
  };

  const toggleOrders = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (ordersMap[id]) return; // 已載入
    setOrdersLoading(id);
    try {
      const res = await fetch(`/api/admin/discounts/${id}/orders`);
      const data = await res.json();
      setOrdersMap((prev) => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
    } catch {
      setOrdersMap((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setOrdersLoading(null);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition"
        >
          + 新增折扣碼
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border p-5 mb-6 space-y-4">
          <h2 className="font-bold">建立折扣碼</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">折扣碼 *</label>
              <input type="text" required value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER20"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">說明（選填）</label>
              <input type="text" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="夏季優惠"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">折扣類型</label>
              <select value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="PERCENTAGE">百分比折扣（%）</option>
                <option value="FIXED">固定金額折扣（TWD）</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                折扣值 * （{form.type === "PERCENTAGE" ? "%" : "TWD"}）
              </label>
              <input type="number" required min="0" step="0.01" value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">最低消費（TWD，選填）</label>
              <input type="number" min="0" value={form.minAmount}
                onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">使用次數上限（選填）</label>
              <input type="number" min="1" value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">到期日（選填）</label>
              <input type="datetime-local" value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="bg-amber-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-amber-600 transition disabled:opacity-50">
              {loading ? "建立中..." : "建立折扣碼"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="border px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
              取消
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">折扣碼</th>
              <th className="text-left px-4 py-3">類型 / 折扣</th>
              <th className="text-center px-4 py-3">使用次數</th>
              <th className="text-left px-4 py-3">到期日</th>
              <th className="text-center px-4 py-3">狀態</th>
              <th className="text-center px-4 py-3">訂單</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {discounts.map((d) => (
              <>
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium font-mono">{d.code}</p>
                    {d.description && <p className="text-xs text-gray-500">{d.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {d.type === "PERCENTAGE" ? `${Number(d.value)}% 折扣` : `NT$${Number(d.value)} 折扣`}
                    {d.minAmount && (
                      <p className="text-xs text-gray-500">最低消費 NT${Number(d.minAmount)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {d.usedCount}{d.maxUses ? ` / ${d.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {d.expiresAt ? formatDate(d.expiresAt) : "無限制"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(d.id, d.isActive)}
                      className={`text-xs px-2 py-0.5 rounded cursor-pointer ${
                        d.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {d.isActive ? "啟用" : "停用"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {d.usedCount > 0 ? (
                      <button
                        onClick={() => toggleOrders(d.id)}
                        className={`text-xs px-2 py-1 rounded border transition ${
                          expandedId === d.id
                            ? "bg-amber-100 border-amber-300 text-amber-800"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {expandedId === d.id ? "▲ 收合" : `▼ 查看 ${d.usedCount} 筆`}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>

                {/* 展開訂單列 */}
                {expandedId === d.id && (
                  <tr key={`${d.id}-orders`}>
                    <td colSpan={6} className="bg-amber-50 px-4 py-3">
                      {ordersLoading === d.id ? (
                        <p className="text-sm text-gray-400 py-2">載入中…</p>
                      ) : (ordersMap[d.id] || []).length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">無訂單記錄</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-amber-800 mb-2">
                            使用折扣碼 <span className="font-mono">{d.code}</span> 的訂單
                          </p>
                          <table className="w-full text-xs bg-white rounded-lg overflow-hidden border">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="text-left px-3 py-2">訂單編號</th>
                                <th className="text-left px-3 py-2">會員</th>
                                <th className="text-left px-3 py-2">商品</th>
                                <th className="text-right px-3 py-2">折扣金額</th>
                                <th className="text-right px-3 py-2">總金額</th>
                                <th className="text-center px-3 py-2">訂單狀態</th>
                                <th className="text-center px-3 py-2">付款</th>
                                <th className="text-center px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {(ordersMap[d.id] || []).map((o) => (
                                <tr key={o.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-mono">{o.orderNumber}</td>
                                  <td className="px-3 py-2">{o.user.name || "—"}</td>
                                  <td className="px-3 py-2 text-gray-500 max-w-[160px]">
                                    {o.items.map((it) => `${it.name}×${it.quantity}`).join("、")}
                                  </td>
                                  <td className="px-3 py-2 text-right text-green-700">
                                    -NT${o.discountAmount.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">
                                    NT${o.totalAmount.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {STATUS_LABELS[o.status] || o.status}
                                  </td>
                                  <td className={`px-3 py-2 text-center font-medium ${PAY_COLORS[o.paymentStatus] || ""}`}>
                                    {PAY_LABELS[o.paymentStatus] || o.paymentStatus}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <Link
                                      href={`/admin/orders/${o.id}`}
                                      className="text-amber-700 hover:underline"
                                    >
                                      詳情
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {discounts.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">尚無折扣碼</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
