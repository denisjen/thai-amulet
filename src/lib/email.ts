import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "no-reply@example.com",
    to: email,
    subject: "【泰國佛牌】密碼重設通知",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #92400e;">泰國佛牌 - 密碼重設</h2>
        <p>您好，我們收到了您的密碼重設申請。</p>
        <p>請點擊以下連結重設您的密碼（此連結 1 小時內有效）：</p>
        <a href="${resetUrl}"
           style="display: inline-block; background: #92400e; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none;
                  margin: 16px 0;">
          重設密碼
        </a>
        <p style="color: #666; font-size: 12px;">
          若非您本人操作，請忽略此郵件，您的密碼不會被更改。
        </p>
      </div>
    `,
  });
}
