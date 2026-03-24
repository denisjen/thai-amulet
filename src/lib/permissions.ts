/**
 * 後台權限管理工具
 *
 * permissions 欄位儲存 JSON 陣列，例如 ["products","products.create","orders","orders.edit"]
 * null / undefined = 全部權限（向下相容，舊有 ADMIN 帳號不受影響）
 *
 * 權限結構：主權限 + 子權限（用 "." 分隔）
 * 擁有主權限 = 可以看到該選單；子權限控制具體操作
 */

export interface SubPermission {
  key: string;
  label: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  description: string;
  subs: SubPermission[];
}

export const ALL_PERMISSIONS: PermissionGroup[] = [
  {
    key: "dashboard", label: "儀表板", description: "查看後台首頁統計",
    subs: [],
  },
  {
    key: "products", label: "商品管理", description: "管理商品",
    subs: [
      { key: "products.view",   label: "查看商品" },
      { key: "products.create", label: "新增商品" },
      { key: "products.edit",   label: "編輯商品" },
      { key: "products.delete", label: "刪除商品" },
    ],
  },
  {
    key: "orders", label: "訂單管理", description: "管理一般訂單",
    subs: [
      { key: "orders.view",   label: "查看訂單" },
      { key: "orders.edit",   label: "編輯訂單狀態" },
      { key: "orders.print",  label: "列印訂單" },
    ],
  },
  {
    key: "ceremonies", label: "法事訂單", description: "管理法事訂單",
    subs: [
      { key: "ceremonies.view",  label: "查看法事訂單" },
      { key: "ceremonies.edit",  label: "編輯法事訂單" },
      { key: "ceremonies.print", label: "列印法事資料" },
    ],
  },
  {
    key: "users", label: "會員管理", description: "管理會員資料",
    subs: [
      { key: "users.view",   label: "查看會員" },
      { key: "users.edit",   label: "編輯會員" },
      { key: "users.delete", label: "刪除會員" },
    ],
  },
  {
    key: "discounts", label: "折扣碼", description: "管理折扣碼",
    subs: [
      { key: "discounts.view",   label: "查看折扣碼" },
      { key: "discounts.create", label: "新增折扣碼" },
      { key: "discounts.edit",   label: "編輯折扣碼" },
      { key: "discounts.delete", label: "刪除折扣碼" },
    ],
  },
  {
    key: "categories", label: "分類管理", description: "管理商品分類",
    subs: [
      { key: "categories.view", label: "查看分類" },
      { key: "categories.edit", label: "編輯分類" },
    ],
  },
  {
    key: "login_logs", label: "登入記錄", description: "查看登入記錄",
    subs: [],
  },
  {
    key: "settings", label: "系統設定", description: "管理系統設定",
    subs: [
      { key: "settings.view", label: "查看設定" },
      { key: "settings.edit", label: "修改設定" },
    ],
  },
  {
    key: "permissions", label: "權限管理", description: "管理管理員權限",
    subs: [
      { key: "permissions.view",         label: "查看權限" },
      { key: "permissions.edit",         label: "編輯權限" },
      { key: "permissions.create_admin", label: "新增管理員" },
    ],
  },
];

/** 所有權限 key（主權限 + 子權限）扁平清單 */
export const ALL_PERMISSION_KEYS: string[] = ALL_PERMISSIONS.flatMap((g) => [
  g.key,
  ...g.subs.map((s) => s.key),
]);

/**
 * 解析 permissions 欄位（JSON string → string[]）
 * null/undefined → null（代表擁有全部權限）
 */
export function parsePermissions(raw: string | null | undefined): string[] | null {
  if (!raw) return null; // 全部權限
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr as string[];
  } catch {}
  return null;
}

/**
 * 檢查使用者是否擁有指定權限
 * 支援主權限和子權限：
 * - hasPermission(perms, "products") → 是否有商品管理主權限
 * - hasPermission(perms, "products.create") → 是否有新增商品子權限
 * - 擁有主權限不代表擁有所有子權限（需明確勾選）
 */
export function hasPermission(
  userPermissions: string | null | undefined,
  required: string
): boolean {
  const parsed = parsePermissions(userPermissions);
  if (parsed === null) return true; // null = 全部權限
  return parsed.includes(required);
}

/**
 * 檢查使用者是否擁有任一指定權限
 */
export function hasAnyPermission(
  userPermissions: string | null | undefined,
  required: string[]
): boolean {
  const parsed = parsePermissions(userPermissions);
  if (parsed === null) return true;
  return required.some((r) => parsed.includes(r));
}
