import { prisma } from "@/lib/db";
import LabelPrintActions from "./LabelPrintActions";
import { checkPermission } from "@/lib/check-permission";

export default async function OrderLabelsPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
    categoryId?: string;
    productName?: string;
    paymentStatus?: string;
  };
}) {
  await checkPermission("orders");
  const todayStr = new Date().toISOString().split("T")[0];
  const dateFrom = searchParams.dateFrom !== undefined ? searchParams.dateFrom : todayStr;
  const dateTo   = searchParams.dateTo   !== undefined ? searchParams.dateTo   : todayStr;

  const where: any = {};
  if (searchParams.status)        where.status        = searchParams.status;
  if (searchParams.paymentStatus) where.paymentStatus = searchParams.paymentStatus;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom + "T00:00:00");
    if (dateTo)   where.createdAt.lte = new Date(dateTo   + "T23:59:59");
  }
  if (searchParams.keyword) {
    const kw = searchParams.keyword.trim();
    where.OR = [
      { orderNumber: { contains: kw } },
      { user: { phone: { contains: kw } } },
      { user: { name:  { contains: kw } } },
    ];
  }
  if (searchParams.categoryId || searchParams.productName) {
    const itemFilter: any = {};
    if (searchParams.productName) itemFilter.name    = { contains: searchParams.productName };
    if (searchParams.categoryId)  itemFilter.product = { categoryId: searchParams.categoryId };
    where.items = { some: itemFilter };
  }

  let orders: any[] = [];
  try {
    const raw = await prisma.order.findMany({
      where,
      select: {
        id:              true,
        orderNumber:     true,
        shippingName:    true,
        shippingPhone:   true,
        shippingAddress: true,
        user: { select: { name: true, phone: true } },
        items: { select: { product: { select: { isCeremony: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });
    // 排除純法事訂單（所有品項都是法事）
    orders = raw.filter((o: any) =>
      o.items.some((item: any) => !item.product?.isCeremony)
    );
  } catch {
    // DB unavailable
  }

  const printTime = new Date().toLocaleString("zh-TW", { hour12: false });
  const backUrl = `/admin/orders/print?${buildQs(searchParams, dateFrom, dateTo)}`;

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        .label-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6mm;
        }
        .label-card {
          border: 1px solid #aaa;
          border-radius: 4px;
          padding: 7mm 8mm;
          page-break-inside: avoid;
          min-height: 44mm;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3mm;
        }
      `}</style>

      {/* 操作列（列印時隱藏） */}
      <div className="no-print flex items-center gap-3 mb-5 p-4 bg-white border rounded-xl">
        <LabelPrintActions backUrl={backUrl} />
        <span className="text-sm text-gray-500">
          共 {orders.length} 筆 ・ 列印時間：{printTime}
        </span>
      </div>

      {/* 標籤區 */}
      <div className="print-area label-grid">
        {orders.map((order) => {
          const name    = order.shippingName  || order.user?.name  || "";
          const phone   = order.shippingPhone || order.user?.phone || "";
          const address = order.shippingAddress || "";

          return (
            <div key={order.id} className="label-card">
              {/* 收件人 + 電話 */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "12mm" }}>
                <div style={{ fontSize: "13pt", fontWeight: 700, whiteSpace: "nowrap" }}>
                  收件人：{name || "—"}
                </div>
                <div style={{ fontSize: "10pt", color: "#444", whiteSpace: "nowrap" }}>
                  電話：{phone || "—"}
                </div>
              </div>

              {/* 地址 */}
              <div style={{ fontSize: "11pt", lineHeight: "1.6" }}>
                <span style={{ color: "#555", marginRight: "4px" }}>地址：</span>
                {address || "（未填寫地址）"}
              </div>

              {/* 訂單號（小字，右下） */}
              <div style={{ fontSize: "7.5pt", color: "#999", textAlign: "right" }}>
                {order.orderNumber}
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div
            className="no-print col-span-2 text-center py-12 text-gray-400"
          >
            沒有符合條件的訂單
          </div>
        )}
      </div>
    </>
  );
}

function buildQs(sp: Record<string, string | undefined>, dateFrom: string, dateTo: string) {
  const p = new URLSearchParams();
  if (sp.status)        p.set("status",        sp.status);
  if (dateFrom)         p.set("dateFrom",       dateFrom);
  if (dateTo)           p.set("dateTo",         dateTo);
  if (sp.keyword)       p.set("keyword",        sp.keyword);
  if (sp.categoryId)    p.set("categoryId",     sp.categoryId);
  if (sp.productName)   p.set("productName",    sp.productName);
  if (sp.paymentStatus) p.set("paymentStatus",  sp.paymentStatus);
  return p.toString();
}
