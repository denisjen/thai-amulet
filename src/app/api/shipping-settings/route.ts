import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: {
        homeDeliveryFee: true,
        cvsPickupFee: true,
        freeShippingThreshold: true,
        enableHomeDelivery: true,
        enableCvsPickup: true,
      },
    });
    return NextResponse.json(settings ?? {
      homeDeliveryFee: 100,
      cvsPickupFee: 60,
      freeShippingThreshold: 3000,
      enableHomeDelivery: true,
      enableCvsPickup: true,
    });
  } catch {
    return NextResponse.json({
      homeDeliveryFee: 100,
      cvsPickupFee: 60,
      freeShippingThreshold: 3000,
      enableHomeDelivery: true,
      enableCvsPickup: true,
    });
  }
}
