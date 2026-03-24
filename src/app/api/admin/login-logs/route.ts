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
  const page       = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize   = 50;
  const provider   = searchParams.get("provider") || "";   // "" | "credentials" | "google"
  const success    = searchParams.get("success") || "";    // "" | "true" | "false"
  const search     = searchParams.get("search") || "";     // identifier / IP / name
  const dateFrom   = searchParams.get("dateFrom") || "";
  const dateTo     = searchParams.get("dateTo") || "";

  const where: any = {};

  if (provider) where.provider = provider;
  if (success !== "") where.success = success === "true";
  if (search) {
    where.OR = [
      { identifier: { contains: search } },
      { ipAddress:  { contains: search } },
      { userName:   { contains: search } },
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

  try {
    const [total, logs] = await Promise.all([
      prisma.loginLog.count({ where }),
      prisma.loginLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return NextResponse.json({ logs, total, page, pageSize });
  } catch (err: any) {
    console.error("[login-logs API]", err);
    return NextResponse.json(
      { error: `查詢失敗: ${err?.message ?? String(err)}`, logs: [], total: 0, page, pageSize },
      { status: 500 }
    );
  }
}
