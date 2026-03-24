"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

interface CeremonyEvent {
  id: string;
  name: string;
  eventDate: string;
  description: string | null;
  isActive: boolean;
  _count: { ceremonies: number };
}

interface Props {
  events: CeremonyEvent[];
}

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function CeremonyEventManager({ events: initialEvents }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState<CeremonyEvent[]>(initialEvents);

  // Sync with server data after router.refresh()
  useEffect(() => { setEvents(initialEvents); }, [initialEvents]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const emptyForm = { name: "", eventDate: "", description: "", isActive: true };
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (ev: CeremonyEvent) => {
    const d = new Date(ev.eventDate);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setForm({
      name: ev.name,
      eventDate: dateStr,
      description: ev.description || "",
      isActive: ev.isActive,
    });
    setEditingId(ev.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("請填寫法事名稱"); return; }
    if (!form.eventDate) { toast.error("請選擇法事日期"); return; }

    setLoading(true);
    try {
      const url = editingId
        ? `/api/ceremony-events/${editingId}`
        : "/api/ceremony-events";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "操作失敗"); return; }

      toast.success(editingId ? "已更新法事項目" : "已新增法事項目");
      setShowForm(false);
      setEditingId(null);
      router.refresh();
    } catch {
      toast.error("網路錯誤");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ceremony-events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "刪除失敗"); return; }
      toast.success("已刪除法事項目");
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setDeleteConfirmId(null);
      router.refresh();
    } catch {
      toast.error("網路錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-gray-800">📋 法事項目管理</h2>
        <button
          onClick={openCreate}
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition"
        >
          ＋ 新增法事項目
        </button>
      </div>

      {/* Create/Edit form */}
      {showForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <h3 className="font-semibold mb-3 text-amber-900">
            {editingId ? "編輯法事項目" : "新增法事項目"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">法事名稱 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例：2026年3月龍婆托開光法事"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">法事日期 *</label>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">說明（選填）</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="法事地點、注意事項等"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm">啟用</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? "儲存中…" : "儲存"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Events list */}
      {events.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center border rounded-xl">
          尚無法事項目，請先新增
        </p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3">法事名稱</th>
                <th className="text-left px-4 py-3">法事日期</th>
                <th className="text-left px-4 py-3">說明</th>
                <th className="text-center px-4 py-3">參與人數</th>
                <th className="text-center px-4 py-3">狀態</th>
                <th className="text-center px-4 py-3">列印</th>
                <th className="text-center px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{ev.name}</td>
                  <td className="px-4 py-3 text-gray-600">{formatEventDate(ev.eventDate)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{ev.description || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
                      {ev._count.ceremonies} 人
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${ev.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {ev.isActive ? "啟用" : "停用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <Link
                        href={`/admin/ceremonies/print-list?eventId=${ev.id}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-800 text-xs border border-blue-200 rounded px-2 py-1 hover:bg-blue-50"
                      >
                        🖨️ 名單
                      </Link>
                      <Link
                        href={`/admin/ceremonies/print-cards?eventId=${ev.id}`}
                        target="_blank"
                        className="text-amber-700 hover:text-amber-900 text-xs border border-amber-200 rounded px-2 py-1 hover:bg-amber-50"
                      >
                        🃏 卡片
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {deleteConfirmId === ev.id ? (
                      <div className="flex gap-1 justify-center items-center text-xs">
                        <span className="text-red-600">確定刪除？</span>
                        <button
                          onClick={() => handleDelete(ev.id)}
                          disabled={loading}
                          className="text-red-600 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50 disabled:opacity-50"
                        >
                          確定
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-gray-500 border rounded px-2 py-0.5 hover:bg-gray-50"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => openEdit(ev)}
                          className="text-gray-600 hover:text-gray-900 text-xs border rounded px-2 py-1 hover:bg-gray-50"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(ev.id)}
                          disabled={ev._count.ceremonies > 0}
                          title={ev._count.ceremonies > 0 ? "已有法事訂單，無法刪除" : ""}
                          className="text-red-500 hover:text-red-700 text-xs border border-red-200 rounded px-2 py-1 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          刪除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
