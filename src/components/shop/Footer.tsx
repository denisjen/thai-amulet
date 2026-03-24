import { prisma } from "@/lib/db";

export default async function Footer() {
  let settings: any = null;
  try {
    settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  } catch {}

  const contactLine = settings?.contactLine || "@thai-amulet";
  const contactEmail = settings?.contactEmail || "contact@example.com";
  const contactServiceHours = settings?.contactServiceHours || "週一至週六 10:00-20:00";
  const footerDescription = settings?.footerDescription || "正品泰國佛牌專賣店，提供各式佛牌及法事服務，品質保障，誠信經營。";

  return (
    <footer className="bg-amber-900 text-amber-200 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-white font-bold mb-3">🙏 泰國佛牌</h3>
          <p className="text-sm">{footerDescription}</p>
        </div>
        <div>
          <h3 className="text-white font-bold mb-3">快速連結</h3>
          <ul className="space-y-1 text-sm">
            <li><a href="/products" className="hover:text-white transition">商品</a></li>
            <li><a href="/orders" className="hover:text-white transition">訂單查詢</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-bold mb-3">聯絡我們</h3>
          <ul className="space-y-1 text-sm">
            {contactLine && <li>LINE: {contactLine}</li>}
            {contactEmail && <li>Email: {contactEmail}</li>}
            {contactServiceHours && <li>服務時間: {contactServiceHours}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-amber-800 text-center py-4 text-xs text-amber-400">
        © {new Date().getFullYear()} 泰國佛牌. All rights reserved.
      </div>
    </footer>
  );
}
