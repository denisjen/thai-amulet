"use client";

import { useState } from "react";

interface Admin {
  id: string;
  name: string;
  email: string;
  phone: string;
  permissions: string[] | null;
  isSelf: boolean;
}

interface SubPerm {
  key: string;
  label: string;
}

interface PermGroup {
  key: string;
  label: string;
  description: string;
  subs: SubPerm[];
}

interface Props {
  admins: Admin[];
  permissionGroups: PermGroup[];
  canCreateAdmin: boolean;
  canEditPermissions: boolean;
}

export default function PermissionManager({
  admins: initialAdmins,
  permissionGroups,
  canCreateAdmin,
  canEditPermissions,
}: Props) {
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [createPerms, setCreatePerms] = useState<string[] | null>(null);

  // ========== 編輯權限 ==========
  function startEdit(admin: Admin) {
    setEditingId(admin.id);
    setEditPerms(admin.permissions ? [...admin.permissions] : null);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPerms(null);
  }

  function toggleFullAccess(perms: string[] | null, setPerms: (v: string[] | null) => void) {
    if (perms === null) {
      // 從全部權限切換到自訂 → 全選
      const all: string[] = [];
      permissionGroups.forEach((g) => {
        all.push(g.key);
        g.subs.forEach((s) => all.push(s.key));
      });
      setPerms(all);
    } else {
      setPerms(null);
    }
  }

  function toggleMainPerm(
    key: string,
    perms: string[] | null,
    setPerms: (v: string[] | null) => void
  ) {
    if (perms === null) return;
    const group = permissionGroups.find((g) => g.key === key);
    if (!group) return;

    const has = perms.includes(key);
    if (has) {
      // 取消主權限 → 同時取消所有子權限
      const toRemove = new Set([key, ...group.subs.map((s) => s.key)]);
      setPerms(perms.filter((p) => !toRemove.has(p)));
    } else {
      // 勾選主權限 → 同時勾選所有子權限
      const toAdd = [key, ...group.subs.map((s) => s.key)];
      setPerms([...perms, ...toAdd.filter((k) => !perms.includes(k))]);
    }
  }

  function toggleSubPerm(
    subKey: string,
    parentKey: string,
    perms: string[] | null,
    setPerms: (v: string[] | null) => void
  ) {
    if (perms === null) return;
    const has = perms.includes(subKey);
    let next: string[];
    if (has) {
      next = perms.filter((p) => p !== subKey);
    } else {
      next = [...perms, subKey];
      // 勾選子權限時，自動勾選主權限
      if (!next.includes(parentKey)) next.push(parentKey);
    }
    setPerms(next);
  }

  async function save(adminId: string) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/permissions/${adminId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: editPerms }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "更新失敗" });
        return;
      }
      setAdmins((prev) =>
        prev.map((a) => (a.id === adminId ? { ...a, permissions: editPerms } : a))
      );
      setEditingId(null);
      setEditPerms(null);
      setMessage({ type: "success", text: "權限已更新" });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: "網路錯誤" });
    } finally {
      setLoading(false);
    }
  }

  // ========== 新增管理員 ==========
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          permissions: createPerms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "建立失敗" });
        return;
      }
      // 加入列表
      setAdmins((prev) => [
        ...prev,
        {
          id: data.admin.id,
          name: data.admin.name || "未命名",
          email: data.admin.email || "",
          phone: data.admin.phone || "",
          permissions: createPerms,
          isSelf: false,
        },
      ]);
      setShowCreateForm(false);
      setCreateForm({ name: "", phone: "", email: "", password: "" });
      setCreatePerms(null);
      setMessage({ type: "success", text: "管理員已建立" });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: "error", text: "網路錯誤" });
    } finally {
      setLoading(false);
    }
  }

  // ========== 權限勾選區塊（共用） ==========
  function PermCheckboxes({
    perms,
    setPerms,
  }: {
    perms: string[] | null;
    setPerms: (v: string[] | null) => void;
  }) {
    return (
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={perms === null}
            onChange={() => toggleFullAccess(perms, setPerms)}
            className="w-4 h-4 accent-amber-600"
          />
          <span className="text-sm font-medium text-gray-700">全部權限（不限制）</span>
        </label>

        {perms !== null && (
          <div className="space-y-2 pl-2">
            {permissionGroups.map((group) => {
              const mainChecked = perms.includes(group.key);
              const allSubsChecked =
                group.subs.length === 0 || group.subs.every((s) => perms.includes(s.key));
              const someSubsChecked =
                group.subs.length > 0 && group.subs.some((s) => perms.includes(s.key));

              return (
                <div key={group.key} className="border rounded-lg overflow-hidden">
                  {/* 主權限 */}
                  <label
                    className={`flex items-center gap-2 p-2.5 cursor-pointer transition ${
                      mainChecked ? "bg-blue-50 border-blue-200" : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={mainChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = mainChecked && someSubsChecked && !allSubsChecked;
                      }}
                      onChange={() => toggleMainPerm(group.key, perms, setPerms)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-sm font-semibold text-gray-800">{group.label}</span>
                    <span className="text-xs text-gray-400 ml-1">{group.description}</span>
                  </label>

                  {/* 子權限 */}
                  {group.subs.length > 0 && mainChecked && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 bg-white border-t">
                      {group.subs.map((sub) => (
                        <label
                          key={sub.key}
                          className="flex items-center gap-1.5 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={perms.includes(sub.key)}
                            onChange={() => toggleSubPerm(sub.key, group.key, perms, setPerms)}
                            className="w-3.5 h-3.5 accent-blue-500"
                          />
                          <span className="text-gray-600">{sub.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`px-4 py-2 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 新增管理員按鈕 */}
      {canCreateAdmin && !showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-600 transition"
        >
          + 新增管理員
        </button>
      )}

      {/* 新增管理員表單 */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-amber-300 ring-1 ring-amber-200 p-5 space-y-4"
        >
          <h3 className="font-semibold text-gray-900">新增管理員</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                密碼 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="至少 6 個字元"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">手機號碼</label>
              <input
                type="text"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="09XXXXXXXX"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="admin@thaiamulet.cc"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">權限設定</p>
            <PermCheckboxes perms={createPerms} setPerms={setCreatePerms} />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
            >
              {loading ? "建立中..." : "建立管理員"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setCreateForm({ name: "", phone: "", email: "", password: "" });
                setCreatePerms(null);
              }}
              disabled={loading}
              className="px-4 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {/* 管理員列表 */}
      {admins.map((admin) => {
        const isEditing = editingId === admin.id;
        const isFullAccess = admin.permissions === null;

        return (
          <div
            key={admin.id}
            className={`bg-white rounded-xl border p-5 ${
              isEditing ? "border-amber-300 ring-1 ring-amber-200" : ""
            }`}
          >
            {/* 管理員資訊列 */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{admin.name}</span>
                  {admin.isSelf && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                      自己
                    </span>
                  )}
                  {isFullAccess && !isEditing && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      全部權限
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {admin.phone && <span className="mr-3">{admin.phone}</span>}
                  {admin.email && <span>{admin.email}</span>}
                </p>
              </div>

              {!admin.isSelf && !isEditing && canEditPermissions && (
                <button
                  onClick={() => startEdit(admin)}
                  className="text-sm px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition"
                >
                  編輯權限
                </button>
              )}
              {admin.isSelf && (
                <span className="text-xs text-gray-400">無法修改自己的權限</span>
              )}
            </div>

            {/* 非編輯狀態：顯示目前權限標籤 */}
            {!isEditing && !isFullAccess && (
              <div className="space-y-1">
                {permissionGroups.map((group) => {
                  const hasMain = admin.permissions?.includes(group.key);
                  if (!hasMain) return null;
                  const activeSubs = group.subs.filter((s) =>
                    admin.permissions?.includes(s.key)
                  );
                  return (
                    <div key={group.key} className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                        {group.label}
                      </span>
                      {activeSubs.length > 0 && activeSubs.length < group.subs.length && (
                        <span className="text-xs text-gray-400">
                          ({activeSubs.map((s) => s.label).join("、")})
                        </span>
                      )}
                    </div>
                  );
                })}
                {/* 未啟用的主權限 */}
                <div className="flex flex-wrap gap-1">
                  {permissionGroups
                    .filter((g) => !admin.permissions?.includes(g.key))
                    .map((g) => (
                      <span
                        key={g.key}
                        className="text-xs px-2 py-0.5 rounded bg-gray-50 text-gray-300 line-through"
                      >
                        {g.label}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* 編輯狀態 */}
            {isEditing && (
              <div className="space-y-3">
                <PermCheckboxes perms={editPerms} setPerms={setEditPerms} />

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => save(admin.id)}
                    disabled={loading}
                    className="px-4 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 transition"
                  >
                    {loading ? "儲存中..." : "儲存"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={loading}
                    className="px-4 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {admins.length === 0 && (
        <p className="text-center text-gray-400 py-8">尚無管理員帳號</p>
      )}
    </div>
  );
}
