import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const isAdmin = (session.user as any).role === "ADMIN";
  const order = await prisma.order.findFirst({
    where: {
      id: params.id,
      ...(!isAdmin ? { userId: session.user.id } : {}),
    },
    include: {
      items: { include: { product: { select: { images: true } } } },
      ceremonies: true,
      user: isAdmin ? { select: { name: true, phone: true, email: true } } : false,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const isAdmin = (session.user as any).role === "ADMIN";

  try {
    const body = await req.json();
    const { status, paymentStatus, bankTransferRef, notes, paymentMethod, cancelReason } = body;

    // 買家：只能更新自己的訂單
    if (!isAdmin) {
      const order = await prisma.order.findFirst({
        where: { id: params.id, userId: session.user.id! },
        select: { id: true, paymentMethod: true, paymentStatus: true, status: true },
      });
      if (!order) return NextResponse.json({ error: "訂單不存在" }, { status: 404 });

      // 申請取消（僅限未付款且管理員尚未處理）
      if (status === "CANCELLED" && cancelReason) {
        if (order.paymentStatus === "PAID") {
          return NextResponse.json({ error: "已付款訂單請聯絡客服取消" }, { status: 400 });
        }
        if (order.status === "CANCELLED") {
          return NextResponse.json({ error: "訂單已取消" }, { status: 400 });
        }
        if (order.status !== "PENDING") {
          return NextResponse.json({ error: "訂單已開始處理，如需取消請聯絡客服" }, { status: 400 });
        }
        const updated = await prisma.order.update({
          where: { id: params.id },
          data: { status: "CANCELLED", notes: cancelReason },
        });
        return NextResponse.json({ order: updated });
      }

      // 更改付款方式（僅限待付款）
      if (paymentMethod !== undefined) {
        if (order.paymentStatus !== "PENDING") {
          return NextResponse.json({ error: "訂單已付款，無法更改付款方式" }, { status: 400 });
        }
        const ALLOWED = ["BANK_TRANSFER", "LINE_PAY", "ALIPAY"];
        if (!ALLOWED.includes(paymentMethod)) {
          return NextResponse.json({ error: "不支援的付款方式" }, { status: 400 });
        }
        const updated = await prisma.order.update({
          where: { id: params.id },
          data: { paymentMethod },
        });
        return NextResponse.json({ order: updated });
      }

      // 填寫匯款末五碼（銀行轉帳限定）
      if (bankTransferRef !== undefined) {
        if (order.paymentMethod !== "BANK_TRANSFER") {
          return NextResponse.json({ error: "非銀行轉帳訂單" }, { status: 400 });
        }
        const updated = await prisma.order.update({
          where: { id: params.id },
          data: { bankTransferRef: String(bankTransferRef).replace(/\D/g, "").slice(0, 5) },
        });
        return NextResponse.json({ order: updated });
      }

      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    // 管理員可更新所有欄位
    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
      if (paymentStatus === "PAID") updateData.paidAt = new Date();
    }
    if (bankTransferRef !== undefined) updateData.bankTransferRef = bankTransferRef;
    if (notes !== undefined) updateData.notes = notes;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    const order = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}
