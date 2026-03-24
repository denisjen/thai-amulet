import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/utils";

async function checkAdmin() {
  const session = await auth();
  return (session?.user as any)?.role === "ADMIN";
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    const { name, slug, sortOrder } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "分類名稱不得為空" }, { status: 400 });
    }

    const newSlug = slug?.trim() || slugify(name.trim()) || name.trim();

    const category = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        slug: newSlug,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({ category });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "此 Slug 已被使用" }, { status: 409 });
    }
    return NextResponse.json({ error: e.message || "更新失敗" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await checkAdmin())) {
      return NextResponse.json({ error: "權限不足" }, { status: 403 });
    }

    // Check if category has products
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      return NextResponse.json({ error: "分類不存在" }, { status: 404 });
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { error: `此分類下有 ${category._count.products} 件商品，無法刪除` },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "刪除失敗" }, { status: 500 });
  }
}
