"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Props {
  orderId: string;
  initialNotes: string;
}

export default function OrderNotesCell({ orderId, initialNotes }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function startEdit() {
    setDraft(notes);
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setDraft(notes);
    setEditing(false);
  }

  async function saveNotes() {
    if (draft === notes) { setEditing(false); return; }

    const prev = notes;
    setNotes(draft);   // 樂觀更新
    setEditing(false);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draft }),
      });
      if (!res.ok) throw new Error();
      toast.success("處理說明已儲存");
      startTransition(() => router.refresh());
    } catch {
      setNotes(prev);  // 回滾
      setDraft(prev);
      toast.error("儲存失敗");
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1 min-w-[180px]">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full border border-amber-400 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          placeholder="輸入處理說明…"
          onKeyDown={(e) => {
            if (e.key === "Escape") cancelEdit();
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) saveNotes();
          }}
        />
        <div className="flex gap-1">
          <button
            onClick={saveNotes}
            disabled={isPending}
            className="flex-1 text-xs bg-amber-700 text-white rounded px-2 py-0.5 hover:bg-amber-600 disabled:opacity-50"
          >
            儲存
          </button>
          <button
            onClick={cancelEdit}
            className="flex-1 text-xs border rounded px-2 py-0.5 text-gray-500 hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={startEdit}
      title="點擊編輯處理說明"
      className="min-w-[120px] max-w-[220px] min-h-[28px] cursor-pointer rounded px-2 py-1 text-xs text-gray-600 hover:bg-amber-50 hover:ring-1 hover:ring-amber-300 transition whitespace-pre-wrap break-words"
    >
      {notes || <span className="text-gray-300 italic">點擊新增說明</span>}
    </div>
  );
}
