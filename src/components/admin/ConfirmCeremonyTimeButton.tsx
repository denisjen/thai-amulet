"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Props {
  ceremonyId: string;
  preferredTime?: string | null;
  confirmedTime?: string | null;
  timeConfirmed: boolean;
}

export default function ConfirmCeremonyTimeButton({
  ceremonyId,
  preferredTime,
  confirmedTime,
  timeConfirmed,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pre-fill with confirmedTime if already set, otherwise use preferredTime (date only)
  const defaultValue = confirmedTime
    ? new Date(confirmedTime).toISOString().slice(0, 10)
    : preferredTime
    ? new Date(preferredTime).toISOString().slice(0, 10)
    : "";
  const [value, setValue] = useState(defaultValue);

  const handleConfirm = async () => {
    if (!value) {
      toast.error("請選擇確認時間");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/ceremonies/${ceremonyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmedTime: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "確認失敗");
        return;
      }
      toast.success("已確認預約時間！");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("網路錯誤");
    } finally {
      setLoading(false);
    }
  };

  if (timeConfirmed && !open) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-green-600 font-medium">
          ✓ {confirmedTime ? new Date(confirmedTime).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" }) : "已確認"}
        </span>
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
        >
          修改
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded hover:bg-amber-200 transition whitespace-nowrap"
        >
          確認時間
        </button>
      ) : (
        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <div className="flex gap-1">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-500 transition disabled:opacity-50"
            >
              {loading ? "確認中..." : "✓ 確認"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
