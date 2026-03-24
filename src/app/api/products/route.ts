import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const isCeremony = searchParams.get("ceremony");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "12");
  const search = searchParams.get("search");
  const isAdmin = searchParams.get("admin") === "true";

  const now = new Date();
  const where: any = { isActive: true };

  if (!isAdmin) {
    // 前台只顯示在上架時間內的商品
    where.AND = [
      { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
      { OR: [{ unpublishAt: null }, { unpublishAt: { gt: now } }] },
    ];
  }

  if (category) where.category = { slug: category };
  if (isCeremony !== null) where.isCeremony = isCeremony === "true";
  if (search) where.name = { contains: search };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { name: true, slug: true } } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ products, total, page, limit });
}

const productSchema = z.object({
  name: z.string().min(1, "商品名稱不得為空"),
  summary: z.string().optional().nullable(),
  description: z.string().min(1, "商品描述不得為空"),
  price: z.number().positive("售價必須大於 0"),
  stock: z.number().int().min(0, "庫存不得為負數"),
  categoryId: z.string().min(1, "請選擇商品分類"),
  images: z.array(z.string()).default([]),
  isCeremony: z.boolean().default(false),
  isOneOnOne: z.boolean().default(false),
  ceremonyEventId: z.string().nullable().optional(),
  ceremonyDate: z.string().nullable().optional(),
  ceremonyLocation: z.string().nullable().optional(),
  specialVersionEnabled: z.boolean().default(false),
  specialVersionSurcharge: z.number().default(0),
  specialVersionLabel: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  publishAt: z.string().nullable().optional(),
  unpublishAt: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message ?? "資料驗證失敗";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const {
      name, images, publishAt, unpublishAt, price, ceremonyDate, ceremonyLocation,
      specialVersionEnabled, specialVersionSurcharge, specialVersionLabel,
      ...rest
    } = parsed.data;
    const slugBase = slugify(name) || "product";
    const slug = slugBase + "-" + Date.now();

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        price: String(price),
        ...rest,
        images: images && images.length > 0 ? JSON.stringify(images) : null,
        publishAt: publishAt ? new Date(publishAt) : null,
        unpublishAt: unpublishAt ? new Date(unpublishAt) : null,
        ceremonyDate: ceremonyDate ? new Date(ceremonyDate) : null,
        ceremonyLocation: ceremonyLocation || null,
      },
    });

    // 用 raw SQL 更新特別版欄位（繞過 Prisma client 版本限制）
    await prisma.$executeRaw`
      UPDATE \`Product\`
      SET specialVersionEnabled = ${specialVersionEnabled ? 1 : 0},
          specialVersionSurcharge = ${specialVersionSurcharge ?? 0},
          specialVersionLabel = ${specialVersionLabel ?? null}
      WHERE id = ${product.id}
    `;

    return NextResponse.json({ product }, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/products]", e);
    return NextResponse.json({ error: e.message || "伺服器錯誤" }, { status: 500 });
  }
}
