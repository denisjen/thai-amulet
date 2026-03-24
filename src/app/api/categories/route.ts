import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  try {
    const { name, slug } = await req.json();
    if (!name || !slug) {
      return NextResponse.json({ error: "名稱和 slug 必填" }, { status: 400 });
    }

    const category = await prisma.category.create({ data: { name, slug } });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "此分類已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }
}
