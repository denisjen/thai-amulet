"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Address {
  id: string;
  name: string;
  phone: string;
  postalCode: string;
  city: string;
  address: string;
  isDefault: boolean;
}

interface AddressFormData {
  name: string;
  phone: string;
  postalCode: string;
  city: string;
  address: string;
  isDefault: boolean;
}

const emptyForm: AddressFormData = { name: "", phone: "", postalCode: "", city: "", address: "", isDefault: false };

interface AddressBookProps {
  initialAddresses: Address[];
}

export default function AddressBook({ initialAddresses }: AddressBookProps) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 當父元件非同步載入地址後，同步更新（僅在未編輯狀態下）
  useEffect(() => {
    if (editingId === null) {
      setAddresses(initialAddresses);
    }
  }, [initialAddresses]); // eslint-disable-line react-hooks/exhaustive-deps // null = not editing, "new" = new form
  const [form, setForm] = useState<AddressFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const startNew = () => {
    setForm(emptyForm);
    setEditingId("new");
  };

  const startEdit = (addr: Address) => {
    setForm({ name: addr.name, phone: addr.phone, postalCode: addr.postalCode, city: addr.city, address: addr.address, isDefault: addr.isDefault });
    setEditingId(addr.id);
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("請填寫收件人姓名"); return; }
    if (!form.phone.trim()) { toast.error("請填寫聯絡電話"); return; }
    if (!form.address.trim()) { toast.error("請填寫詳細地址"); return; }

    setSaving(true);
    try {
      let res: Response;
      if (editingId === "new") {
        res = await fetch("/api/account/address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch(`/api/account/address/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }

      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "儲存失敗"); return; }

      // Reload addresses list
      const listRes = await fetch("/api/account/address");
      const listData = await listRes.json();
      setAddresses(listData.addresses || []);
      toast.success(editingId === "new" ? "地址已新增" : "地址已更新");
      cancel();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此地址？")) return;
    const res = await fetch(`/api/account/address/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("刪除失敗"); return; }
    setAddresses((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      // If we deleted the default, mark the first one as default in UI
      if (prev.find((a) => a.id === id)?.isDefault && updated.length > 0) {
        updated[0] = { ...updated[0], isDefault: true };
      }
      return updated;
    });
    toast.success("地址已刪除");
  };

  const handleSetDefault = async (id: string) => {
    const res = await fetch(`/api/account/address/${id}`, { method: "PATCH" });
    if (!res.ok) { toast.error("設定失敗"); return; }
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    toast.success("已設為預設地址");
  };

  return (
    <div>
      {/* Address cards */}
      {addresses.length > 0 && (
        <div className="space-y-3 mb-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`border rounded-xl p-4 relative ${addr.isDefault ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white"}`}
            >
              {addr.isDefault && (
                <span className="absolute top-3 right-3 text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full">
                  預設
                </span>
              )}
              <p className="font-medium text-gray-900 text-sm">{addr.name} · {addr.phone}</p>
              <p className="text-sm text-gray-600 mt-0.5">
                {[addr.postalCode, addr.city, addr.address].filter(Boolean).join(" ")}
              </p>
              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => startEdit(addr)}
                  className="text-xs text-amber-700 hover:underline"
                >
                  編輯
                </button>
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    設為預設
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(addr.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addresses.length === 0 && editingId === null && (
        <p className="text-sm text-gray-400 mb-4">尚未儲存任何地址</p>
      )}

      {/* Edit / New form */}
      {editingId !== null && (
        <div className="border rounded-xl p-4 bg-gray-50 space-y-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {editingId === "new" ? "新增地址" : "編輯地址"}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">收件人姓名 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="姓名"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">聯絡電話 *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0912345678"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">郵遞區號</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                placeholder="100"
                maxLength={6}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1 text-gray-600">縣市 / 鄉鎮市區</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="台北市信義區"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600">詳細地址 *</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="街道、門牌號碼"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            設為預設地址
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition disabled:opacity-50"
            >
              {saving ? "儲存中…" : "儲存"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition text-gray-600"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Add new button */}
      {editingId === null && (
        <button
          type="button"
          onClick={startNew}
          className="flex items-center gap-1.5 text-sm text-amber-700 border border-amber-300 px-4 py-2 rounded-lg hover:bg-amber-50 transition"
        >
          + 新增地址
        </button>
      )}
    </div>
  );
}
