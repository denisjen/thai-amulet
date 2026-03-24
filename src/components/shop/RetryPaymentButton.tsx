"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function RetryPaymentButton({
  orderId,
  paymentMethod = "OTHER",
}: {
  orderId: string;
  paymentMethod?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      // LINE Pay：重新取得付款 URL 後導向
      if (paymentMethod === "LINE_PAY") {
        const res = await fetch("/api/payment/linepay/request", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (!res.ok || !data.paymentUrl) {
          toast.error(data.error || "LINE Pay 建立失敗");
          return;
        }
        window.location.href = data.paymentUrl;
        return;
      }

      // 其他（目前走 confirm 假金流）
      const res = await fetch("/api/payment/confirm", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "付款失敗，請稍後再試");
        return;
      }
      toast.success("付款成功！");
      router.push(`/orders/${orderId}?payment=success`);
      router.refresh();
    } catch {
      toast.error("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const label = paymentMethod === "LINE_PAY" ? "💚 LINE Pay 付款" : "💳 立即付款";

  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      className="w-full mt-4 bg-amber-700 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          付款處理中...
        </>
      ) : label}
    </button>
  );
}
