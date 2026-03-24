"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface CeremonyEvent {
  id: string;
  name: string;
}

interface Props {
  ceremonyId: string;
  currentEventId: string | null;
  events: CeremonyEvent[];
}

export default function CeremonyEventSelect({ ceremonyId, currentEventId, events }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(currentEventId || "");
  const [saving, setSaving] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVal = e.target.value;
    setValue(newVal);
    setSaving(true);
    try {
      const res = await fetch(`/api/ceremonies/${ceremonyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ceremonyEventId: newVal || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "指定失敗");
        setValue(currentEventId || "");
      } else {
        toast.success("已更新法事項目");
        router.refresh();
      }
    } catch {
      toast.error("網路錯誤");
      setValue(currentEventId || "");
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={saving}
      className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50 max-w-[180px]"
    >
      <option value="">— 未指定 —</option>
      {events.map((ev) => (
        <option key={ev.id} value={ev.id}>
          {ev.name}
        </option>
      ))}
    </select>
  );
}
