import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("ibgme,he1a", 12);
  const admin = await prisma.user.upsert({
    where: { phone: "0900000000" },
    update: { email: "admin@thaiamulet.cc", password: adminPassword },
    create: {
      phone: "0900000000",
      name: "系統管理員",
      email: "admin@thaiamulet.cc",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin created:", admin.phone);

  // Create categories
  const categories = [
    { name: "龍婆托", slug: "luang-por-to" },
    { name: "阿贊", slug: "ajarn" },
    { name: "符管", slug: "takrut" },
    { name: "佛像", slug: "buddha-statue" },
    { name: "法事服務", slug: "ceremony" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    console.log("✅ Category created:", cat.name);
  }

  // Create site settings
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      siteName: "泰國佛牌",
      bankName: "台灣銀行",
      bankAccount: "請設定銀行帳號",
      bankHolder: "請設定戶名",
      contactPhone: "0900-000-000",
      contactEmail: "contact@example.com",
    },
  });
  console.log("✅ Site settings created");

  console.log("✨ Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
