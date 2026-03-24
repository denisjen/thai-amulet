// 由於 SQL Server 不支援 Prisma enum，改用字串常數

export const Role = {
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const OrderStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMethod = {
  CREDIT_CARD: "CREDIT_CARD",
  ATM_TRANSFER: "ATM_TRANSFER",
  LINE_PAY: "LINE_PAY",
  BANK_TRANSFER: "BANK_TRANSFER",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const DiscountType = {
  PERCENTAGE: "PERCENTAGE",
  FIXED: "FIXED",
} as const;
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

export const OrderStatusLabels: Record<string, string> = {
  PENDING: "待確認",
  CONFIRMED: "已確認",
  PROCESSING: "處理中",
  SHIPPED: "已出貨",
  DELIVERED: "已完成",
  CANCELLED: "已取消",
};

export const PaymentMethodLabels: Record<string, string> = {
  CREDIT_CARD: "信用卡",
  ATM_TRANSFER: "ATM 轉帳",
  LINE_PAY: "LINE Pay",
  BANK_TRANSFER: "銀行轉帳",
};

export const PaymentStatusLabels: Record<string, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  FAILED: "付款失敗",
  REFUNDED: "已退款",
};
