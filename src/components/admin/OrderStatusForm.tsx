"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const ORDER_STATUSES = [
  { value: "PENDING", label: "待確認" },
  { value: "CONFIRMED", label: "已確認" },
  { value: "PROCESSING", label: "處理中" },
  { value: "SHIPPED", label: "已出貨" },
  { value: "DELIVERED", label: "已送達" },
  { value: "CANCELLED", label: "已取消" },
];

const PAYMENT_STATUSES = [
  { value: "PENDING", label: "待付款" },
  { value: "PAID", label: "已付款" },
  { value: "FAILED", label: "付款失敗" },
  { value: "REFUNDED", label: "已退款" },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "銀行轉帳",
  LINE_PAY: "LINE Pay",
  ALIPAY: "支付寶",
  CREDIT_CARD: "信用卡",
  VIRTUAL_ACCOUNT: "虛擬帳號",
};

// 快速處理選項
const QUICK_ACTIONS = [
  {
    label: "確認訂單",
    status: "CONFIRMED",
    icon: "✓",
    style: "border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100",
    activeStyle: "bg-blue-600 text-white border-blue-600",
    pendingStyle: "border-yellow-300 bg-yellow-50 text-yellow-800",
  },
  {
    label: "開始處理",
    status: "PROCESSING",
    icon: "⚙",
    style: "border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100",
    activeStyle: "bg-purple-600 text-white border-purple-600",
    pendingStyle: "border-yellow-300 bg-yellow-50 text-yellow-800",
  },
  {
    label: "標記出貨",
    status: "SHIPPED",
    icon: "📦",
    style: "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100",
    activeStyle: "bg-amber-600 text-white border-amber-600",
    pendingStyle: "border-yellow-300 bg-yellow-50 text-yellow-800",
  },
  {
    label: "確認送達",
    status: "DELIVERED",
    icon: "✅",
    style: "border-green-200 text-green-700 bg-green-50 hover:bg-green-100",
    activeStyle: "bg-green-600 text-white border-green-600",
    pendingStyle: "border-yellow-300 bg-yellow-50 text-yellow-800",
  },
  {
    label: "取消訂單",
    status: "CANCELLED",
    icon: "✕",
    style: "border-red-200 text-red-700 bg-red-50 hover:bg-red-100",
    activeStyle: "bg-red-600 text-white border-red-600",
    pendingStyle: "border-yellow-300 bg-yellow-50 text-yellow-800",
  },
];

export default function OrderStatusForm({ order }: { order: any }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const paymentMethod = order.paymentMethod || "BANK_TRANSFER";
  const [bankRef, setBankRef] = useState(order.bankTransferRef || "");
  const [notes, setNotes] = useState(order.notes || "");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const callApi = async (data: Record<string, unknown>) => {
    setLoading(true);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setLoading(false);
    return res;
  };

  const handleSave = async () => {
    // 銀行轉帳訂單必須核對末五碼才能調整任何狀態
    if (paymentMethod === "BANK_TRANSFER" && !bankRef.trim()) {
      toast.error("請先填入轉帳末五碼再調整訂單狀態");
      return;
    }
    const data: Record<string, unknown> = { status, paymentStatus, notes };
    // 只有管理員有值時才送出，避免覆蓋客戶填入的末五碼
    if (bankRef) data.bankTransferRef = bankRef;
    const res = await callApi(data);
    if (res.ok) {
      toast.success("訂單已更新");
      router.refresh();
    } else {
      toast.error("更新失敗");
    }
  };

  const handleQuickAction = async (action: (typeof QUICK_ACTIONS)[0]) => {
    if (pendingAction === action.status) {
      // 二次確認 — 執行
      setPendingAction(null);
      const data: Record<string, unknown> = { status: action.status, paymentStatus, notes };
      if (bankRef) data.bankTransferRef = bankRef;
      // 銀行轉帳確認訂單時，自動將付款狀態改為已付款
      if (action.status === "CONFIRMED" && paymentMethod === "BANK_TRANSFER" && paymentStatus === "PENDING") {
        data.paymentStatus = "PAID";
      }
      const res = await callApi(data);
      if (res.ok) {
        setStatus(action.status);
        if (action.status === "CONFIRMED" && paymentMethod === "BANK_TRANSFER" && paymentStatus === "PENDING") {
          setPaymentStatus("PAID");
        }
        toast.success(`已${action.label}`);
        router.refresh();
      } else {
        toast.error("操作失敗");
      }
    } else {
      // 第一次點擊前先驗證（銀行轉帳須填末五碼才能調整任何狀態）
      if (paymentMethod === "BANK_TRANSFER" && !bankRef.trim()) {
        toast.error("請先填入轉帳末五碼再調整訂單狀態");
        return;
      }
      // 第一次點擊 — 等待確認
      setPendingAction(action.status);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-5">
      <h2 className="font-bold mb-5">訂單處理</h2>

      {/* ── 處理選項 ── */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          處理選項
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => {
            const isCurrent = status === action.status;
            const isPending = pendingAction === action.status;
            const needsBankRef =
              paymentMethod === "BANK_TRANSFER" &&
              !bankRef.trim();
            return (
              <span key={action.status} className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickAction(action)}
                  title={needsBankRef ? "請先填入轉帳末五碼" : undefined}
                  className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition disabled:opacity-50
                    ${isCurrent
                      ? action.activeStyle
                      : isPending
                        ? action.pendingStyle
                        : needsBankRef
                          ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed"
                          : action.style
                    }`}
                >
                  {isPending
                    ? `確認${action.label}？`
                    : needsBankRef
                      ? `⚠ ${action.label}`
                      : `${action.icon} ${action.label}`}
                </button>
                {isPending && (
                  <button
                    type="button"
                    onClick={() => setPendingAction(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-1 py-1"
                  >
                    取消
                  </button>
                )}
              </span>
            );
          })}
        </div>
        {pendingAction && (
          <p className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-1.5 inline-block">
            ⚠ 再次點擊按鈕以確認操作，點「取消」放棄
          </p>
        )}
      </div>

      <div className="border-t pt-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          手動調整
        </p>

        {/* 銀行轉帳未收到末五碼時顯示鎖定提示 */}
        {paymentMethod === "BANK_TRANSFER" && !bankRef.trim() && (
          <div className="mb-4 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-800">
            <span>🔒</span>
            <span>尚未收到匯款末五碼，請先於下方填入後才可調整訂單狀態與付款狀態。</span>
          </div>
        )}

        {/* 訂單狀態 & 付款狀態 & 付款方式 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">訂單狀態</label>
            <select
              value={status}
              disabled={paymentMethod === "BANK_TRANSFER" && !bankRef.trim()}
              onChange={(e) => {
                const newStatus = e.target.value;
                setStatus(newStatus);
                if (newStatus === "CONFIRMED" && paymentStatus === "PENDING") {
                  setPaymentStatus("PAID");
                }
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">付款方式</label>
            <p className="border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
              {PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod}
            </p>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">付款狀態</label>
            <select
              value={paymentStatus}
              disabled={paymentMethod === "BANK_TRANSFER" && !bankRef.trim()}
              onChange={(e) => {
                const newPayment = e.target.value;
                setPaymentStatus(newPayment);
                // 付款狀態變更時自動同步訂單狀態
                if (newPayment === "PAID" && (status === "PENDING")) {
                  setStatus("CONFIRMED");
                } else if (newPayment === "REFUNDED") {
                  setStatus("CANCELLED");
                } else if (newPayment === "PENDING" && status === "CONFIRMED") {
                  setStatus("PENDING");
                }
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 銀行轉帳末 5 碼（條件顯示）*/}
        {paymentMethod === "BANK_TRANSFER" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">銀行轉帳末 5 碼</label>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch(`/api/orders/${order.id}`);
                  if (res.ok) {
                    const data = await res.json();
                    const latest = data.order?.bankTransferRef || "";
                    setBankRef(latest);
                    if (latest) toast.success(`已同步：${latest}`);
                    else toast("客戶尚未填寫末五碼");
                  }
                }}
                className="text-xs text-amber-700 hover:underline flex items-center gap-1"
                title="重新讀取客戶填入的末五碼"
              >
                🔄 同步客戶填入值
              </button>
            </div>
            <input
              type="text"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              placeholder="客戶轉帳帳號末 5 碼"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}

        {/* ── 處理說明 ── */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            處理說明
            <span className="ml-1 text-xs text-gray-400 font-normal">
              （內部備注，顧客不可見）
            </span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="記錄處理過程、退款原因、特殊備注…"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading || (paymentMethod === "BANK_TRANSFER" && !bankRef.trim())}
            className="bg-amber-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "儲存中..." : "儲存變更"}
          </button>
        </div>
      </div>
    </div>
  );
}
