import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { generateOrderNumber } from "@/lib/utils";
import { z } from "zod";

const orderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      name: z.string().optional(),
      price: z.number().positive().optional(),
      quantity: z.number().int().positive(),
    })
  ),
  paymentMethod: z.enum(["CREDIT_CARD", "ATM_TRANSFER", "LINE_PAY", "ALIPAY", "BANK_TRANSFER"]),
  couponCode: z.string().optional(),
  shippingName: z.string().optional(),
  shippingPhone: z.string().optional(),
  shippingAddress: z.string().optional(),
  notes: z.string().optional(),
  shippingMethod: z.string().optional(),
  shippingFee: z.number().optional(),
  cvsStoreId: z.string().optional(),
  cvsStoreName: z.string().optional(),
  ceremonyInfos: z
    .array(
      z.object({
        name: z.string(),
        englishName: z.string().optional(),
        phone: z.string(),
        birthDate: z.string(),
        birthTime: z.string().optional(),
        lunarBirth: z.string().optional(),
        photoPath: z.string().nullable().optional(),
        notes: z.string().optional(),
        preferredTime: z.string().optional(),
      })
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const {
      items, paymentMethod, couponCode, ceremonyInfos,
      shippingMethod, shippingFee: shippingFeeInput,
      cvsStoreId, cvsStoreName,
      ...rest
    } = parsed.data;

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: {
        id: true, name: true, price: true, stock: true,
        isCeremony: true, isOneOnOne: true, ceremonyEventId: true,
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "部分商品不存在" }, { status: 400 });
    }

    // ── 庫存驗證（法事商品、一對一商品不受庫存限制）──────────────────
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (!product.isCeremony && !product.isOneOnOne && product.stock < item.quantity) {
        return NextResponse.json(
          { error: `「${product.name}」庫存不足（剩餘 ${product.stock} 件）` },
          { status: 400 }
        );
      }
    }

    let discountAmount = 0;
    if (couponCode) {
      const discount = await prisma.discount.findFirst({
        where: {
          code: couponCode.toUpperCase(),
          isActive: true,
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          ],
        },
      });
      if (discount) {
        const subtotal = items.reduce((sum, item) => {
          const product = products.find((p) => p.id === item.productId)!;
          const unitPrice = item.price ?? Number(product.price);
          return sum + unitPrice * item.quantity;
        }, 0);
        if (!discount.minAmount || subtotal >= Number(discount.minAmount)) {
          discountAmount =
            discount.type === "PERCENTAGE"
              ? (subtotal * Number(discount.value)) / 100
              : Number(discount.value);
          await prisma.discount.update({
            where: { id: discount.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }
    }

    const subtotal = items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const unitPrice = item.price ?? Number(product.price);
      return sum + unitPrice * item.quantity;
    }, 0);

    const shippingFeeDecimal = shippingFeeInput ?? 0;
    const totalAmount = Math.max(0, subtotal - discountAmount + shippingFeeDecimal);

    // 產生當日流水號：查詢今天已建立幾筆訂單
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const dayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const todayPrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const todayCount = await prisma.order.count({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
        orderNumber: { startsWith: todayPrefix },
      },
    });

    // 取第一個法事商品的 ceremonyEventId（供法事建立用）
    const ceremonyProduct = products.find((p) => p.isCeremony);
    const autoEventId = ceremonyProduct?.ceremonyEventId || null;

    // ── Transaction：建立訂單 + 扣除庫存 ────────────────
    const order = await prisma.$transaction(async (tx) => {
      // 1. 建立訂單
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(todayCount + 1, now),
          userId: session.user.id!,
          paymentMethod,
          subtotal,
          discountAmount,
          totalAmount,
          couponCode,
          shippingMethod: shippingMethod ?? null,
          shippingFee: shippingFeeDecimal,
          ...rest,
          items: {
            create: items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: item.productId,
                name: item.name || product.name,
                price: String(item.price ?? Number(product.price)),
                quantity: item.quantity,
              };
            }),
          },
          ceremonies: ceremonyInfos && ceremonyInfos.length > 0
            ? {
                create: ceremonyInfos.map((ci, idx) => ({
                  ...ci,
                  participantIndex: idx,
                  birthDate: new Date(ci.birthDate),
                  birthTime: ci.birthTime || null,
                  preferredTime: ci.preferredTime ? new Date(ci.preferredTime) : null,
                  ceremonyEventId: autoEventId,
                })),
              }
            : undefined,
        },
        include: {
          items: true,
          ceremonies: true,
        },
      });

      // 2. CVS 門市資訊（Prisma client 尚未熱更新時用 raw SQL 寫入）
      if (cvsStoreId || cvsStoreName) {
        await tx.$executeRaw`
          UPDATE \`Order\`
          SET cvsStoreId   = ${cvsStoreId   ?? null},
              cvsStoreName = ${cvsStoreName ?? null}
          WHERE id = ${newOrder.id}
        `;
      }

      // 3. 扣除一般商品庫存（法事商品、一對一商品不扣）
      for (const item of items) {
        const product = products.find((p) => p.id === item.productId)!;
        if (!product.isCeremony && !product.isOneOnOne) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }
      }

      return newOrder;
    });

    // 自動儲存法事個人資料到歷史記錄（失敗不影響訂單）
    if (ceremonyInfos && ceremonyInfos.length > 0) {
      const userId = session.user.id!;
      for (const ci of ceremonyInfos) {
        if (!ci.name || !ci.phone || !ci.birthDate) continue;
        try {
          const birthDateStr = ci.birthDate.substring(0, 10);
          const existing: any[] = await prisma.$queryRaw`
            SELECT id FROM \`CeremonyProfile\`
            WHERE userId = ${userId} AND name = ${ci.name} AND phone = ${ci.phone} AND birthDate = ${birthDateStr}
            LIMIT 1
          `;
          if (existing.length > 0) {
            await prisma.$executeRaw`
              UPDATE \`CeremonyProfile\`
              SET englishName = ${ci.englishName ?? null},
                  birthTime   = ${ci.birthTime   ?? null},
                  lunarBirth  = ${ci.lunarBirth  ?? null},
                  photoPath   = ${ci.photoPath   ?? null},
                  updatedAt   = NOW()
              WHERE id = ${existing[0].id}
            `;
          } else {
            const id = "c" + require("crypto").randomBytes(11).toString("hex");
            const now = new Date();
            await prisma.$executeRaw`
              INSERT INTO \`CeremonyProfile\`
                (id, userId, name, englishName, phone, birthDate, birthTime, lunarBirth, photoPath, createdAt, updatedAt)
              VALUES
                (${id}, ${userId}, ${ci.name}, ${ci.englishName ?? null}, ${ci.phone}, ${birthDateStr},
                 ${ci.birthTime ?? null}, ${ci.lunarBirth ?? null}, ${ci.photoPath ?? null}, ${now}, ${now})
            `;
          }
        } catch (e) {
          console.warn("[ceremony-profile save]", e);
        }
      }
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (err: any) {
    console.error("[orders POST]", err);
    const msg = err?.message || String(err);
    return NextResponse.json({ error: `建立訂單失敗：${msg}` }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const isAdmin = (session.user as any).role === "ADMIN";
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status");

  const where: any = {};
  if (!isAdmin) where.userId = session.user.id;
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: true,
        ceremonies: isAdmin,
        user: isAdmin ? { select: { name: true, phone: true } } : false,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}
