import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page      = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize  = 50;
  const search    = searchParams.get("search") || "";
  const dateFrom  = searchParams.get("dateFrom") || "";
  const dateTo    = searchParams.get("dateTo") || "";
  const onlyAnon  = searchParams.get("onlyAnon") === "1";

  try {
    const where: any = {};

    if (onlyAnon) where.userId = null;

    if (search) {
      where.OR = [
        { path:      { contains: search } },
        { ipAddress: { contains: search } },
        { sessionId: { contains: search } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [total, logs] = await Promise.all([
      prisma.visitLog.count({ where }),
      prisma.visitLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // 批次查詢路徑中出現的商品 slug → name 對應表
    const slugSet = new Set<string>();
    for (const log of logs) {
      const m = log.path.match(/^\/products\/([^/?#]+)/);
      if (m) slugSet.add(m[1]);
    }
    let productMap: Record<string, string> = {};
    if (slugSet.size > 0) {
      const products = await prisma.product.findMany({
        where: { slug: { in: [...slugSet] } },
        select: { slug: true, name: true },
      });
      productMap = Object.fromEntries(products.map((p) => [p.slug, p.name]));
    }

    // 在每筆 log 附上 productName（若有）
    const enriched = logs.map((log) => {
      const m = log.path.match(/^\/products\/([^/?#]+)/);
      const productName = m ? (productMap[m[1]] ?? null) : null;
      return { ...log, productName };
    });

    return NextResponse.json({ logs: enriched, total, page, pageSize });
  } catch (err: any) {
    console.error("[visit-logs API]", err);
    return NextResponse.json(
      { error: `查詢失敗: ${err?.message ?? String(err)}` },
      { status: 500 }
    );
  }
}
