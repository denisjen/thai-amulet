"use client";

import { useState } from "react";

interface ProductTabsProps {
  description: string;
  isCeremony: boolean;
  shoppingNotes?: string | null;
  shippingMethods?: string | null;
}

type TabId = "desc" | "info" | "shipping";

export default function ProductTabs({ description, isCeremony, shoppingNotes, shippingMethods }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("desc");

  const tabs: { id: TabId; label: string }[] = [
    { id: "desc", label: "商品描述" },
    { id: "info", label: "購物須知" },
    { id: "shipping", label: "運送方式" },
  ];

  return (
    <div className="mt-12 border border-gray-200 rounded-xl overflow-hidden">
      {/* Tab headers */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 text-sm font-medium transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-amber-700 text-amber-700 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6 md:p-8 bg-white">
        {activeTab === "desc" && (
          <div
            className="prose prose-sm md:prose max-w-none
              prose-headings:text-gray-900
              prose-p:text-gray-700
              prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900
              prose-ul:text-gray-700
              prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: description || "<p>暫無描述</p>" }}
          />
        )}

        {activeTab === "info" && (
          shoppingNotes ? (
            <div
              className="prose prose-sm md:prose max-w-none
                prose-headings:text-gray-900 prose-p:text-gray-700
                prose-a:text-amber-700 prose-strong:text-gray-900
                prose-ul:text-gray-700 prose-ol:text-gray-700"
              dangerouslySetInnerHTML={{ __html: shoppingNotes }}
            />
          ) : (
            <div className="space-y-5 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-base text-gray-900 mb-2">📋 購物注意事項</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>所有商品均為正品保證，直接從泰國進口</li>
                  <li>商品圖片皆為實際拍攝，細節以實物為準</li>
                  <li>付款確認後 1–3 個工作日內出貨</li>
                  <li>如有商品瑕疵，請於收貨 7 日內聯繫客服處理</li>
                  <li>佛牌屬宗教文物，非瑕疵品恕不接受無故退換</li>
                </ul>
              </div>
              {isCeremony && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="font-semibold text-base text-gray-900 mb-2">🙏 法事服務注意事項</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>預約成功後，請提供個人出生年月日（農曆或國曆）</li>
                    <li>需上傳近照一張，供法師於法事施法使用</li>
                    <li>個人資料受嚴格保護，僅限本次法事使用，絕不對外透露</li>
                    <li>法事完成後將透過 LINE 或 Email 通知您結果</li>
                    <li>法事服務恕無法退款，請謹慎確認後再行預約</li>
                  </ul>
                </div>
              )}
              <div className="mt-4 pt-4 border-t">
                <h3 className="font-semibold text-base text-gray-900 mb-2">🔒 退換貨政策</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>收到商品後 7 天內如有瑕疵，可申請退換</li>
                  <li>退換貨商品需保持原包裝及完整配件</li>
                  <li>退款將於確認後 5–7 個工作日退回原付款方式</li>
                </ul>
              </div>
            </div>
          )
        )}

        {activeTab === "shipping" && (
          shippingMethods ? (
            <div
              className="prose prose-sm md:prose max-w-none
                prose-headings:text-gray-900 prose-p:text-gray-700
                prose-a:text-amber-700 prose-strong:text-gray-900
                prose-ul:text-gray-700 prose-ol:text-gray-700"
              dangerouslySetInnerHTML={{ __html: shippingMethods }}
            />
          ) : (
            <div className="space-y-5 text-sm text-gray-700">
              <h3 className="font-semibold text-base text-gray-900 mb-3">📦 運送方式與費用</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-xl p-4 hover:border-amber-300 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🚚</span>
                    <p className="font-semibold text-gray-900">宅配（黑貓 / 新竹）</p>
                  </div>
                  <p className="text-gray-600">運費 NT$100</p>
                  <p className="text-amber-700 font-medium mt-1">消費滿 NT$3,000 免運費</p>
                  <p className="text-gray-400 text-xs mt-2">預計 2–5 個工作日到貨</p>
                </div>
                <div className="border border-gray-200 rounded-xl p-4 hover:border-amber-300 transition">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🏪</span>
                    <p className="font-semibold text-gray-900">超商取貨（7-11 / 全家）</p>
                  </div>
                  <p className="text-gray-600">運費 NT$60</p>
                  <p className="text-amber-700 font-medium mt-1">消費滿 NT$1,000 免運費</p>
                  <p className="text-gray-400 text-xs mt-2">預計 3–5 個工作日到貨</p>
                </div>
              </div>
              <p className="text-gray-400 text-xs">※ 離島地區運費另計，歡迎來電或 LINE 詢問</p>
              <p className="text-gray-400 text-xs">※ 法事服務為純服務項目，不涉及實體寄送</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
