import { checkPermission } from "@/lib/check-permission";
import LoginLogsClient from "./LoginLogsClient";

export default async function LoginLogsPage() {
  await checkPermission("login_logs");
  return <LoginLogsClient />;
}
