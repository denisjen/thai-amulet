"use client";

import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { useCartStore } from "@/store/cart";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";
import CeremonyForm, { CeremonyData } from "@/components/shop/CeremonyForm";

const PAYMENT_METHODS = [
  { value: "LINE_PAY",     label: "💚 LINE Pay",  desc: "LINE Pay 快速付款",           disabled: false },
  { value: "BANK_TRANSFER",label: "🏦 銀行轉帳",  desc: "手動匯款，需提供帳號後 5 碼",  disabled: false },
];

// 目前跳過實際金流，直接確認付款
const SKIP_PAYMENT_GATEWAY = true;

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-center py-16">載入中...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutType = searchParams.get("type"); // "ceremony" | "regular" | null
  const { items, removeItem, updateQuantity } = useCartStore();

  // 根據結帳類型過濾商品
  const checkoutItems = useMemo(() => {
    if (checkoutType === "ceremony") return items.filter((i) => i.isCeremony);
    if (checkoutType === "regular") return items.filter((i) => !i.isCeremony);
    return items;
  }, [items, checkoutType]);
  const [paymentMethod, setPaymentMethod] = useState("LINE_PAY");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState<{ amount: number; desc: string } | null>(null);
  const [shippingInfo, setShippingInfo] = useState({
    name: "",
    phone: "",
    postalCode: "",
    city: "",
    address: "",
  });
  const [profilePrefilled, setProfilePrefilled] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shippingMethod, setShippingMethod] = useState<"HOME_DELIVERY" | "CVS_PICKUP">("HOME_DELIVERY");
  const [cvsStore, setCvsStore] = useState<{
    CVSStoreID: string;
    CVSStoreName: string;
    CVSAddress: string;
    CVSTelephone: string;
  } | null>(null);
  const [shippingSettings, setShippingSettings] = useState({
    homeDeliveryFee: 100,
    cvsPickupFee: 60,
    freeShippingThreshold: 3000,
    enableHomeDelivery: true,
    enableCvsPickup: true,
  });
  const prefetchedRef = useRef(false);

  // 載入個人資料與預設地址以自動帶入收件資料
  useEffect(() => {
    if (!session?.user || prefetchedRef.current) return;
    prefetchedRef.current = true;
    Promise.all([
      fetch("/api/account/profile").then((r) => r.json()),
      fetch("/api/account/address").then((r) => r.json()),
    ]).then(([profileData, addrData]) => {
      const user = profileData.user;
      const addrs: any[] = addrData.addresses || [];
      setSavedAddresses(addrs);
      const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
      if (defaultAddr) {
        setShippingInfo({
          name: defaultAddr.name || user?.name || "",
          phone: defaultAddr.phone || user?.phone || "",
          postalCode: defaultAddr.postalCode || "",
          city: defaultAddr.city || "",
          address: defaultAddr.address || "",
        });
        setSelectedAddressId(defaultAddr.id);
        setProfilePrefilled(true);
      } else if (user) {
        setShippingInfo({
          name: user.name || "",
          phone: user.phone || "",
          postalCode: "",
          city: "",
          address: "",
        });
        if (user.name) setProfilePrefilled(true);
      }
    });
  }, [session]);

  // 載入運費設定
  useEffect(() => {
    fetch("/api/shipping-settings")
      .then((r) => r.json())
      .then((data) => {
        setShippingSettings(data);
        // If home delivery is disabled but CVS is enabled, switch default
        if (!data.enableHomeDelivery && data.enableCvsPickup) {
          setShippingMethod("CVS_PICKUP");
        }
      })
      .catch(() => {});
  }, []);

  // 接收 CVS popup 門市選擇結果
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "CVS_STORE_SELECTED") {
        const { CVSStoreID, CVSStoreName, CVSAddress, CVSTelephone } = event.data;
        setCvsStore({ CVSStoreID, CVSStoreName, CVSAddress, CVSTelephone });
        // 自動填入地址欄位
        setShippingInfo((prev) => ({
          ...prev,
          address: CVSAddress || "",
          postalCode: "",
          city: "",
        }));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const hasCeremony = checkoutItems.some((i) => i.isCeremony);
  // 此次結帳全部都是法事，不需要寄送地址
  const onlyCeremony = checkoutItems.length > 0 && checkoutItems.every((i) => i.isCeremony);
  // 是否有一對一法事（需等管理員確認時間才付款）
  const hasOneOnOneCeremony = checkoutItems.some((i) => i.isCeremony && i.isOneOnOne);
  // 此次結帳中的法事商品列表
  const ceremonyItems = checkoutItems.filter((i) => i.isCeremony);
  // 每個法事商品各自的個人資料表單：{ [itemId]: (CeremonyData | null)[] }
  const [ceremonyForms, setCeremonyForms] = useState<Record<string, (CeremonyData | null)[]>>(
    () => Object.fromEntries(ceremonyItems.map((item) => [item.id, Array(item.quantity).fill(null)]))
  );
  const subtotal = checkoutItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const shippingFee = useMemo(() => {
    if (onlyCeremony) return 0;
    if (shippingSettings.freeShippingThreshold > 0 && subtotal >= shippingSettings.freeShippingThreshold) return 0;
    if (shippingMethod === "CVS_PICKUP") return shippingSettings.cvsPickupFee;
    return shippingSettings.homeDeliveryFee;
  }, [onlyCeremony, subtotal, shippingSettings, shippingMethod]);

  const finalTotal = subtotal - (discount?.amount || 0) + shippingFee;

  if (checkoutItems.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">
          {items.length > 0 ? "此類別沒有可結帳的商品" : "購物車是空的"}
        </p>
        <Link href={items.length > 0 ? "/cart" : "/products"} className="text-amber-700 hover:underline">
          去選購商品
        </Link>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-gray-600 mb-4">請先登入才能結帳</p>
        <Link
          href="/login?callbackUrl=/checkout"
          className="bg-amber-700 text-white px-6 py-2.5 rounded-lg"
        >
          前往登入
        </Link>
      </div>
    );
  }

  const applyAddress = (addr: any) => {
    setShippingInfo({
      name: addr.name,
      phone: addr.phone,
      postalCode: addr.postalCode || "",
      city: addr.city || "",
      address: addr.address,
    });
    setSelectedAddressId(addr.id);
  };

  const openCvsMap = (subtype: string = "UNIMART") => {
    const url = `/api/cvs/map?subtype=${subtype}`;
    const popup = window.open(url, "cvsMap", "width=800,height=600,scrollbars=yes,resizable=yes");
    if (!popup) {
      toast.error("請允許彈出視窗以選擇門市");
    }
  };

  const validateCoupon = async () => {
    if (!couponCode) return;
    const res = await fetch("/api/discounts/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode, subtotal }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    setDiscount({
      amount: data.discountAmount,
      desc: `${data.discount.code}: ${data.discount.type === "PERCENTAGE" ? `${data.discount.value}% 折扣` : `NT$${data.discount.value} 折扣`}`,
    });
    toast.success("折扣碼套用成功！");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 收件資料必填驗證（純法事訂單不需要地址）
    if (!onlyCeremony) {
      if (!shippingInfo.name.trim()) {
        toast.error("請填寫收件人姓名");
        return;
      }
      if (!shippingInfo.phone.trim()) {
        toast.error("請填寫聯絡電話");
        return;
      }
      if (shippingMethod === "CVS_PICKUP" && !cvsStore) {
        toast.error("請先選擇取貨門市");
        return;
      }
      if (!shippingInfo.address.trim() && shippingMethod !== "CVS_PICKUP") {
        toast.error("請填寫收件地址");
        return;
      }
    }

    if (hasCeremony) {
      for (const item of ceremonyItems) {
        // slice 到 item.quantity，避免數量減少後殘留的 null 誤報
        const forms = Array.from(
          { length: item.quantity },
          (_, i) => (ceremonyForms[item.id] ?? [])[i] ?? null
        );
        const missingIdx = forms.findIndex((f) => f === null);
        if (missingIdx !== -1) {
          toast.error(
            item.quantity > 1
              ? `請完整填寫「${item.name}」第 ${missingIdx + 1} 位的法事個人資料`
              : `請填寫「${item.name}」的法事個人資料`
          );
          return;
        }
      }
    }

    // 組合完整收件地址
    const fullAddress = [shippingInfo.postalCode, shippingInfo.city, shippingInfo.address]
      .filter(Boolean)
      .join(" ");

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: checkoutItems.map((i) => ({
            productId: i.id.replace(/-special$/, ""),
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          paymentMethod,
          couponCode: discount ? couponCode : undefined,
          shippingName: shippingInfo.name,
          shippingPhone: shippingInfo.phone,
          shippingAddress: fullAddress,
          shippingMethod: onlyCeremony ? undefined : shippingMethod,
          shippingFee: shippingFee,
          ...(shippingMethod === "CVS_PICKUP" && cvsStore ? {
            cvsStoreId:   cvsStore.CVSStoreID,
            cvsStoreName: cvsStore.CVSStoreName,
          } : {}),
          ceremonyInfos: hasCeremony
            ? ceremonyItems.flatMap((item) => ceremonyForms[item.id] || [])
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "建立訂單失敗");
        return;
      }

      const orderId = data.order.id;
      // 只移除此次結帳的商品，保留另一類型的購物車內容
      checkoutItems.forEach((i) => removeItem(i.id));

      // Save address if requested
      if (saveAddress && shippingInfo.address.trim()) {
        fetch("/api/account/address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: shippingInfo.name,
            phone: shippingInfo.phone,
            postalCode: shippingInfo.postalCode,
            city: shippingInfo.city,
            address: shippingInfo.address,
            isDefault: false,
          }),
        }).catch(() => {});
      }

      // 一對一法事訂單：需等管理員確認預約時間後才付款
      if (hasOneOnOneCeremony) {
        toast.success("預約申請已送出，請等候時間確認！");
        router.push(`/orders/${orderId}?awaiting_time=true`);
        return;
      }

      // 銀行轉帳不走金流，直接顯示轉帳資訊（優先於 SKIP_PAYMENT_GATEWAY）
      if (paymentMethod === "BANK_TRANSFER") {
        router.push(`/orders/${orderId}?payment=bank`);
        return;
      }

      // LINE Pay 付款
      if (paymentMethod === "LINE_PAY") {
        const lpRes = await fetch("/api/payment/linepay/request", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ orderId }),
        });
        const lpData = await lpRes.json();
        if (!lpRes.ok || !lpData.paymentUrl) {
          toast.error(lpData.error || "LINE Pay 建立失敗");
          return;
        }
        window.location.href = lpData.paymentUrl;
        return;
      }

      // 支付寶付款
      if (paymentMethod === "ALIPAY") {
        const apRes = await fetch("/api/payment/alipay/request", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ orderId }),
        });
        const apData = await apRes.json();
        if (!apRes.ok || !apData.paymentUrl) {
          toast.error(apData.error || "支付寶建立失敗");
          return;
        }
        window.location.href = apData.paymentUrl;
        return;
      }

      if (SKIP_PAYMENT_GATEWAY) {
        // 跳過實際金流，直接確認付款
        const confirmRes = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const confirmData = await confirmRes.json();
        if (!confirmRes.ok) {
          toast.error(confirmData.error || "確認付款失敗");
          router.push(`/orders/${orderId}`);
          return;
        }
        toast.success("訂單已確認！");
        router.push(`/orders/${orderId}?payment=success`);
        return;
      }

      const payRes = await fetch("/api/payment/ecpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          choosePayment:
            paymentMethod === "CREDIT_CARD"
              ? "Credit"
              : paymentMethod === "ATM_TRANSFER"
              ? "ATM"
              : "ALL",
        }),
      });
      const payData = await payRes.json();

      const form = document.createElement("form");
      form.method = "POST";
      form.action = payData.actionUrl;
      Object.entries(payData.fields).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v as string;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {checkoutType === "ceremony" ? "🙏 法事服務結帳" : checkoutType === "regular" ? "📿 一般商品結帳" : "結帳"}
      </h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* 法事個資（依購物車中的法事品項分組顯示） */}
            {hasCeremony && (
              <div className="space-y-6">
                {ceremonyItems.map((item) => (
                  <div key={item.id} className="space-y-4">
                    {/* 法事品項標題 */}
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                      <span className="text-lg">🙏</span>
                      <span className="font-semibold text-amber-900">{item.name}</span>
                      {item.quantity > 1 && (
                        <span className="ml-1 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                          × {item.quantity} 份
                        </span>
                      )}
                    </div>
                    {/* 每份對應一張個人資料表 */}
                    {Array.from({ length: item.quantity }).map((_, personIdx) => (
                      <CeremonyForm
                        key={personIdx}
                        index={personIdx}
                        total={item.quantity}
                        isOneOnOne={item.isOneOnOne ?? false}
                        onChange={(data) => {
                          setCeremonyForms((prev) => {
                            const itemForms = [
                              ...(prev[item.id] ?? Array(item.quantity).fill(null)),
                            ];
                            itemForms[personIdx] = data;
                            return { ...prev, [item.id]: itemForms };
                          });
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* 運送方式（純法事訂單不顯示） */}
            {!onlyCeremony && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-bold text-lg mb-4">運送方式</h2>
                <div className="space-y-2">
                  {shippingSettings.enableHomeDelivery && (
                    <label
                      className={`flex items-center gap-3 border rounded-lg p-3 transition cursor-pointer ${
                        shippingMethod === "HOME_DELIVERY"
                          ? "border-amber-500 bg-amber-50"
                          : "hover:border-amber-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="HOME_DELIVERY"
                        checked={shippingMethod === "HOME_DELIVERY"}
                        onChange={() => { setShippingMethod("HOME_DELIVERY"); setCvsStore(null); }}
                        className="text-amber-600"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">🏠 宅配到府</p>
                        {shippingSettings.freeShippingThreshold > 0 && (
                          <p className="text-xs text-gray-500">滿 NT${shippingSettings.freeShippingThreshold.toLocaleString()} 免運</p>
                        )}
                      </div>
                      <span className="text-sm font-medium text-amber-800">
                        {shippingSettings.freeShippingThreshold > 0 && subtotal >= shippingSettings.freeShippingThreshold
                          ? <span className="text-green-600">免運</span>
                          : `NT$${shippingSettings.homeDeliveryFee}`}
                      </span>
                    </label>
                  )}
                  {shippingSettings.enableCvsPickup && (
                    <div>
                      <label
                        className={`flex items-center gap-3 border rounded-lg p-3 transition cursor-pointer ${
                          shippingMethod === "CVS_PICKUP"
                            ? "border-amber-500 bg-amber-50"
                            : "hover:border-amber-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="shippingMethod"
                          value="CVS_PICKUP"
                          checked={shippingMethod === "CVS_PICKUP"}
                          onChange={() => setShippingMethod("CVS_PICKUP")}
                          className="text-amber-600"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">🏪 超商取貨</p>
                          {shippingSettings.freeShippingThreshold > 0 && (
                            <p className="text-xs text-gray-500">滿 NT${shippingSettings.freeShippingThreshold.toLocaleString()} 免運</p>
                          )}
                        </div>
                        <span className="text-sm font-medium text-amber-800">
                          {shippingSettings.freeShippingThreshold > 0 && subtotal >= shippingSettings.freeShippingThreshold
                            ? <span className="text-green-600">免運</span>
                            : `NT$${shippingSettings.cvsPickupFee}`}
                        </span>
                      </label>

                      {/* 7-11 門市選擇（超商取貨選中後才顯示） */}
                      {shippingMethod === "CVS_PICKUP" && (
                        <div className="mt-2 ml-1 space-y-2">
                          {/* 目前選擇的門市 */}
                          {cvsStore ? (
                            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                              <span className="text-green-600 text-lg leading-tight mt-0.5">✓</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-green-800 truncate">{cvsStore.CVSStoreName}</p>
                                <p className="text-xs text-green-700 mt-0.5 truncate">{cvsStore.CVSAddress}</p>
                                {cvsStore.CVSTelephone && (
                                  <p className="text-xs text-green-600 mt-0.5">☎ {cvsStore.CVSTelephone}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => openCvsMap("UNIMART")}
                                className="text-xs text-amber-700 hover:text-amber-900 whitespace-nowrap"
                              >
                                重新選擇
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                onClick={() => openCvsMap("UNIMART")}
                                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-amber-300 rounded-lg py-3 text-amber-700 hover:border-amber-500 hover:bg-amber-50 transition text-sm font-medium"
                              >
                                <span className="text-base">🏪</span>
                                選擇 7-11 取貨門市
                              </button>
                              <p className="text-xs text-gray-400 text-center">點擊後將開啟門市地圖視窗</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 收件資料（純法事訂單不顯示） */}
            {!onlyCeremony && <div className="bg-white rounded-xl border p-5">
              {/* CVS 取貨時只顯示收件人姓名和電話 */}
              {shippingMethod === "CVS_PICKUP" ? (
                <div>
                  <h2 className="font-bold text-lg mb-4">取貨人資料</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        取貨人姓名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.name}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                        placeholder="請輸入姓名"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        聯絡電話 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={shippingInfo.phone}
                        onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                        placeholder="請輸入電話"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  {cvsStore && (
                    <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-700">取貨門市：</span>
                      {cvsStore.CVSStoreName}　{cvsStore.CVSAddress}
                    </div>
                  )}
                </div>
              ) : (
              <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">收件資料</h2>
                {profilePrefilled && (
                  <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                    ✓ 已從個人資料帶入
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {/* Saved addresses selector */}
                {savedAddresses.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">選擇已儲存地址</p>
                    <div className="space-y-2">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          type="button"
                          onClick={() => applyAddress(addr)}
                          className={`w-full text-left border rounded-lg px-3 py-2.5 text-sm transition ${
                            selectedAddressId === addr.id
                              ? "border-amber-500 bg-amber-50"
                              : "border-gray-200 hover:border-amber-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{addr.name} · {addr.phone}</span>
                            {addr.isDefault && (
                              <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">預設</span>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {[addr.postalCode, addr.city, addr.address].filter(Boolean).join(" ")}
                          </p>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => { setSelectedAddressId(null); setShippingInfo({ name: "", phone: "", postalCode: "", city: "", address: "" }); setSaveAddress(true); }}
                        className={`w-full text-left border rounded-lg px-3 py-2.5 text-sm transition ${
                          selectedAddressId === null ? "border-amber-500 bg-amber-50" : "border-dashed border-gray-300 hover:border-amber-300"
                        }`}
                      >
                        <span className="text-gray-500">+ 使用新地址</span>
                      </button>
                    </div>
                  </div>
                )}
                {/* 姓名 + 電話 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      收件人姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shippingInfo.name}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, name: e.target.value })}
                      placeholder="請輸入姓名"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      聯絡電話 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                      placeholder="請輸入電話"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
                {/* 郵遞區號 + 縣市 */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">郵遞區號</label>
                    <input
                      type="text"
                      value={shippingInfo.postalCode}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                      placeholder="例：100"
                      maxLength={6}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">縣市 / 鄉鎮市區</label>
                    <input
                      type="text"
                      value={shippingInfo.city}
                      onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                      placeholder="例：台北市信義區"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
                {/* 詳細地址 */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    詳細地址 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                    placeholder="請輸入街道、門牌號碼"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {/* Save address checkbox - only show when using new address or no saved addresses */}
                {(selectedAddressId === null || savedAddresses.length === 0) && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    儲存至我的地址名單
                  </label>
                )}
              </div>
              </div>
              )}
            </div>}

            {/* 付款方式 */}
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-bold text-lg mb-4">付款方式</h2>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((pm) => (
                  <label
                    key={pm.value}
                    className={`flex items-center gap-3 border rounded-lg p-3 transition ${
                      pm.disabled
                        ? "opacity-40 cursor-not-allowed bg-gray-50"
                        : paymentMethod === pm.value
                        ? "border-amber-500 bg-amber-50 cursor-pointer"
                        : "hover:border-amber-300 cursor-pointer"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={pm.value}
                      checked={paymentMethod === pm.value}
                      onChange={() => !pm.disabled && setPaymentMethod(pm.value)}
                      disabled={pm.disabled}
                      className="text-amber-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{pm.label}</p>
                      <p className="text-xs text-gray-500">{pm.desc}</p>
                    </div>
                    {pm.disabled && (
                      <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">暫停服務</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-bold text-lg mb-4">訂單摘要</h2>
              <div className="space-y-2 text-sm mb-4">
                {checkoutItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="flex-1 truncate text-gray-700">{item.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const newQty = item.quantity - 1;
                          if (newQty <= 0) {
                            removeItem(item.id);
                            setCeremonyForms((prev) => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                          } else {
                            updateQuantity(item.id, newQty);
                            // 修剪法事資料陣列，移除多出的尾端項目
                            if (item.isCeremony) {
                              setCeremonyForms((prev) => ({
                                ...prev,
                                [item.id]: (prev[item.id] ?? []).slice(0, newQty),
                              }));
                            }
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 transition text-base leading-none"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-medium text-gray-800">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 transition text-base leading-none"
                      >
                        +
                      </button>
                    </div>
                    <span className="w-20 text-right text-gray-600 shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="border-t pt-3 mb-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="折扣碼"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={validateCoupon}
                    className="bg-amber-100 text-amber-800 px-3 rounded-lg text-sm hover:bg-amber-200 transition"
                  >
                    套用
                  </button>
                </div>
                {discount && (
                  <p className="text-green-600 text-xs mt-1">
                    ✓ {discount.desc} (-{formatCurrency(discount.amount)})
                  </p>
                )}
              </div>

              <div className="space-y-1 text-sm border-t pt-3">
                <div className="flex justify-between text-gray-600">
                  <span>小計</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount && (
                  <div className="flex justify-between text-green-600">
                    <span>折扣</span>
                    <span>-{formatCurrency(discount.amount)}</span>
                  </div>
                )}
                {!onlyCeremony && (
                  <div className="flex justify-between text-gray-600">
                    <span>運費</span>
                    {shippingFee > 0 ? (
                      <span>{formatCurrency(shippingFee)}</span>
                    ) : (
                      <span className="text-green-600">免運</span>
                    )}
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>總計</span>
                  <span className="text-amber-900">{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-amber-700 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition disabled:opacity-50"
              >
                {loading ? "處理中..." : hasOneOnOneCeremony ? "🙏 送出預約申請" : "確認付款"}
              </button>
              {hasOneOnOneCeremony && (
                <p className="text-xs text-center text-amber-700 mt-2">
                  送出後等管理員確認預約時間，確認後才可付款
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
