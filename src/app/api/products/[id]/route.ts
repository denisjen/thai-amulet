import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const isAdmin = new URL(req.url).searchParams.get("admin") === "true";
  const now = new Date();

  const baseWhere: any = {
    OR: [{ id: params.id }, { slug: params.id }],
    isActive: true,
  };

  if (!isAdmin) {
    baseWhere.AND = [
      { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
      { OR: [{ unpublishAt: null }, { unpublishAt: { gt: now } }] },
    ];
  }

  const product = await prisma.product.findFirst({
    where: baseWhere,
    include: { category: { select: { name: true, slug: true } } },
  });

  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name, summary, description, price, stock, categoryId, images,
      isCeremony, isOneOnOne,
      ceremonyEventId, ceremonyDate, ceremonyLocation,
      specialVersionEnabled, specialVersionSurcharge, specialVersionLabel,
      isActive, sortOrder, publishAt, unpublishAt,
    } = body;

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(summary !== undefined && { summary: summary || null }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: String(price) }),
        ...(stock !== undefined && { stock }),
        ...(categoryId !== undefined && { categoryId }),
        ...(isCeremony !== undefined && { isCeremony }),
        ...(isOneOnOne !== undefined && { isOneOnOne }),
        ...(ceremonyEventId !== undefined && { ceremonyEventId: ceremonyEventId || null }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
        images: images !== undefined
          ? (images && images.length > 0 ? JSON.stringify(images) : null)
          : undefined,
        publishAt: publishAt !== undefined ? (publishAt ? new Date(publishAt) : null) : undefined,
        unpublishAt: unpublishAt !== undefined ? (unpublishAt ? new Date(unpublishAt) : null) : undefined,
        ceremonyDate: ceremonyDate !== undefined ? (ceremonyDate ? new Date(ceremonyDate) : null) : undefined,
        ceremonyLocation: ceremonyLocation !== undefined ? (ceremonyLocation || null) : undefined,
      },
    });

    // 用 raw SQL 更新特別版欄位（繞過 Prisma client 版本限制）
    if (specialVersionEnabled !== undefined) {
      const enabled = specialVersionEnabled ? 1 : 0;
      const surcharge = Number(specialVersionSurcharge ?? 0);
      const label = specialVersionLabel ?? null;
      await prisma.$executeRaw`
        UPDATE \`Product\`
        SET specialVersionEnabled   = ${enabled},
            specialVersionSurcharge = ${surcharge},
            specialVersionLabel     = ${label}
        WHERE id = ${params.id}
      `;
    }

    return NextResponse.json({ product });
  } catch (e: any) {
    console.error("[PUT /api/products/:id]", e);
    return NextResponse.json({ error: e.message || "更新失敗" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  try {
    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
  }
}
