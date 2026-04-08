import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Parse shipping fee fields explicitly to ensure correct types
    const allowedFields: Record<string, unknown> = { ...body };
    if ("homeDeliveryFee" in body) {
      allowedFields.homeDeliveryFee = parseInt(String(body.homeDeliveryFee), 10) || 0;
    }
    if ("cvsPickupFee" in body) {
      allowedFields.cvsPickupFee = parseInt(String(body.cvsPickupFee), 10) || 0;
    }
    if ("freeShippingThreshold" in body) {
      allowedFields.freeShippingThreshold = parseInt(String(body.freeShippingThreshold), 10) || 0;
    }
    if ("enableHomeDelivery" in body) {
      allowedFields.enableHomeDelivery = body.enableHomeDelivery === true || body.enableHomeDelivery === "true";
    }
    if ("enableCvsPickup" in body) {
      allowedFields.enableCvsPickup = body.enableCvsPickup === true || body.enableCvsPickup === "true";
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...allowedFields },
      update: allowedFields,
    });
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}
