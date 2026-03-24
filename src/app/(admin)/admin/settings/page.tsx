import { prisma } from "@/lib/db";
import SettingsForm from "@/components/admin/SettingsForm";
import { checkPermission } from "@/lib/check-permission";

export default async function AdminSettingsPage() {
  await checkPermission("settings");
  let settings: any = null;
  try {
    settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if (!settings) {
      settings = await prisma.siteSettings.create({ data: { id: "singleton" } });
    }
  } catch {
    // Database not connected yet
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">系統設定</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
