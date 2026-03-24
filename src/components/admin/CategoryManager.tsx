"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { slugify } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  _count: { products: number };
}

interface EditState {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export default function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();

  // Create form
  const [newName, setNewName] = useState("");
  const [newSortOrder, setNewSortOrder] = useState(0);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Create ─────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug: slugify(newName.trim()) || newName.trim(),
          sortOrder: newSortOrder,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("分類已建立");
        setNewName("");
        setNewSortOrder(0);
        router.refresh();
      } else {
        toast.error(data.error || "建立失敗");
      }
    } finally {
      setCreating(false);
    }
  };

  // ── Start edit ─────────────────────────────────────────
  const startEdit = (cat: Category) => {
    setEditState({ id: cat.id, name: cat.name, slug: cat.slug, sortOrder: cat.sortOrder });
  };

  const cancelEdit = () => setEditState(null);

  // ── Save edit ──────────────────────────────────────────
  const handleSave = async () => {
    if (!editState || !editState.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${editState.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editState.name.trim(),
          slug: editState.slug.trim() || slugify(editState.name.trim()),
          sortOrder: editState.sortOrder,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("已儲存");
        setEditState(null);
        router.refresh();
      } else {
        toast.error(data.error || "儲存失敗");
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("分類已刪除");
        setDeleteId(null);
        router.refresh();
      } else {
        toast.error(data.error || "刪除失敗");
        setDeleteId(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-white rounded-xl border p-5">
        <h2 className="font-bold mb-4 text-gray-900">新增分類</h2>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="分類名稱（例：龍婆托、阿贊、符管）"
            className="flex-1 min-w-[180px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">排序：</label>
            <input
              type="number"
              value={newSortOrder}
              onChange={(e) => setNewSortOrder(Number(e.target.value))}
              className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              min={0}
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="bg-amber-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-amber-600 transition disabled:opacity-50 font-medium"
          >
            {creating ? "新增中…" : "＋ 新增"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">排序數字越小排越前面，相同時依名稱排序</p>
      </form>

      {/* Category list */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900">分類列表</h2>
          <span className="text-sm text-gray-500">{categories.length} 個分類</span>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">📂</p>
            <p className="text-sm">尚無分類，請先新增</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 w-8 text-gray-500">#</th>
                <th className="text-left px-4 py-3">分類名稱</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Slug（網址）</th>
                <th className="text-center px-4 py-3">商品數</th>
                <th className="text-right px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((cat, index) =>
                editState?.id === cat.id ? (
                  // ── Edit row ──────────────────────────────
                  <tr key={cat.id} className="bg-amber-50">
                    <td className="px-4 py-3 text-gray-400 text-xs text-center">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <input
                          autoFocus
                          value={editState.name}
                          onChange={(e) =>
                            setEditState((s) =>
                              s ? { ...s, name: e.target.value, slug: slugify(e.target.value) || s.slug } : s
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); handleSave(); }
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="border-2 border-amber-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-full"
                          placeholder="分類名稱"
                        />
                        <p className="text-xs text-amber-600">按 Enter 儲存・按 Esc 取消</p>
                        <div className="flex items-center gap-1 md:hidden">
                          <span className="text-xs text-gray-400">Slug：</span>
                          <input
                            value={editState.slug}
                            onChange={(e) => setEditState((s) => s ? { ...s, slug: e.target.value } : s)}
                            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1 font-mono"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <input
                        value={editState.slug}
                        onChange={(e) => setEditState((s) => s ? { ...s, slug: e.target.value } : s)}
                        className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 w-full font-mono"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        value={editState.sortOrder}
                        onChange={(e) => setEditState((s) => s ? { ...s, sortOrder: Number(e.target.value) } : s)}
                        className="border rounded px-2 py-1 text-xs text-center w-16 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        min={0}
                        title="排序"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="text-sm bg-amber-700 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition disabled:opacity-50 font-medium shadow-sm"
                        >
                          {saving ? "儲存中…" : "✓ 儲存"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-sm bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                        >
                          ✕ 取消
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : deleteId === cat.id ? (
                  // ── Delete confirm row ───────────────────
                  <tr key={cat.id} className="bg-red-50">
                    <td colSpan={5} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-sm text-red-700 font-medium">
                          確定要刪除「{cat.name}」嗎？此操作無法復原。
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(cat.id)}
                            disabled={deleting}
                            className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition disabled:opacity-50"
                          >
                            {deleting ? "刪除中…" : "確認刪除"}
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 transition"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // ── Normal row ───────────────────────────
                  <tr key={cat.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-500 text-xs text-center font-medium">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">
                      {cat.slug}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center text-xs font-medium px-2 py-0.5 rounded-full ${
                        cat._count.products > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {cat._count.products} 件
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(cat)}
                          className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-100 transition"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => setDeleteId(cat.id)}
                          disabled={cat._count.products > 0}
                          title={cat._count.products > 0 ? `此分類有 ${cat._count.products} 件商品，無法刪除` : "刪除分類"}
                          className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded hover:bg-red-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
