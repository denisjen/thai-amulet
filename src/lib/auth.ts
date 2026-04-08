import NextAuth, { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

/** 從 Request headers 擷取客戶端 IP（含 null guard） */
function getIp(req?: Request | null): string | null {
  try {
    return (
      req?.headers?.get("x-forwarded-for")?.split(",")[0].trim() ||
      req?.headers?.get("x-real-ip") ||
      null
    );
  } catch {
    return null;
  }
}

/** 安全地寫入 LoginLog，任何錯誤都不影響主流程 */
async function writeLoginLog(data: {
  userId?: string | null;
  userName?: string | null;
  provider: string;
  identifier?: string | null;
  success: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.loginLog.create({ data });
  } catch {
    // 記錄失敗不中斷登入流程
  }
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        login: { label: "手機/Email", type: "text" },
        password: { label: "密碼", type: "password" },
      },
      async authorize(credentials, request) {
        const login = (credentials?.login as string) || "";
        const ip = getIp(request);
        const ua = request?.headers?.get?.("user-agent") ?? null;

        if (!login || !credentials?.password) {
          await writeLoginLog({ provider: "credentials", identifier: login || null, success: false, ipAddress: ip, userAgent: ua });
          return null;
        }

        // 支援手機號碼或 Email 登入
        const user = await prisma.user.findFirst({
          where: { OR: [{ phone: login }, { email: login }] },
        });

        const isValidUser = user && user.isActive && user.password;
        const isValidPass = isValidUser
          ? await bcrypt.compare(credentials.password as string, user!.password!)
          : false;

        if (!isValidUser || !isValidPass) {
          await writeLoginLog({
            userId: user?.id ?? null,
            userName: user?.name ?? null,
            provider: "credentials",
            identifier: login,
            success: false,
            ipAddress: ip,
            userAgent: ua,
          });
          return null;
        }

        // 登入成功 — 把 ip/ua 附在 user 物件供 signIn callback 使用
        const returnUser = {
          id: user!.id,
          name: user!.name,
          email: user!.email,
          phone: user!.phone,
          role: user!.role,
        };
        (returnUser as any)._loginIp = ip;
        (returnUser as any)._loginUa = ua;
        return returnUser;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Google OAuth：建立或連結帳號，並將 dbUserId 寫入 user 物件供 jwt callback 使用
      if (account?.provider === "google") {
        try {
          const googleId = account.providerAccountId;
          const email = (profile?.email ?? user.email) as string | undefined;
          const name = ((profile as any)?.name ?? user.name ?? "") as string;

          console.log("[NextAuth] Google signIn:", { googleId, email, name });

          let dbUser = await prisma.user.findFirst({ where: { googleId } });

          if (!dbUser && email) {
            dbUser = await prisma.user.findFirst({ where: { email } });
          }

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: { email: email ?? null, name, googleId, isActive: true },
            });
          } else if (!dbUser.googleId) {
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { googleId },
            });
          }

          // 將 DB 的 id、role、phone 寫入 user，供 jwt callback 使用
          user.id = dbUser.id;
          (user as any).role = dbUser.role;
          (user as any).phone = dbUser.phone ?? null;
          (user as any).needsPasswordSetup = !dbUser.password;

          // 記錄 Google 登入 LOG（IP 在此處無法直接取得，留空）
          await writeLoginLog({
            userId: dbUser.id,
            userName: dbUser.name,
            provider: "google",
            identifier: email ?? null,
            success: true,
          });

          return true;
        } catch (err) {
          console.error("[NextAuth] signIn Google error:", err);
          return true;
        }
      }

      // Credentials 登入成功 — 寫入 LOG（ip/ua 由 authorize 附在 user 物件上）
      if (account?.provider === "credentials") {
        await writeLoginLog({
          userId: user.id ?? null,
          userName: user.name ?? null,
          provider: "credentials",
          identifier: (user as any).email || (user as any).phone || null,
          success: true,
          ipAddress: (user as any)._loginIp ?? null,
          userAgent: (user as any)._loginUa ?? null,
        });
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.phone = (user as any).phone ?? null;
        token.role = (user as any).role;
        token.needsPasswordSetup = (user as any).needsPasswordSetup ?? false;
      }
      if (trigger === "update" && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { password: true, phone: true },
          });
          token.needsPasswordSetup = !dbUser?.password;
          if (dbUser?.phone) token.phone = dbUser.phone;
        } catch {}
      }
      return token;
    },

    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).phone = token.phone;
        (session.user as any).role = token.role;
        (session.user as any).needsPasswordSetup = token.needsPasswordSetup ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
