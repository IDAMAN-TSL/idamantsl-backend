/**
 * mailer.ts
 *
 * Helper untuk mengirim email menggunakan nodemailer.
 * Konfigurasi SMTP diambil dari environment variables.
 *
 * Env yang dibutuhkan:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=emailkamu@gmail.com
 *   SMTP_PASS=app-password-16-karakter
 *   SMTP_FROM="IDAMAN TSL <emailkamu@gmail.com>"
 *   FRONTEND_URL=http://localhost:3000
 */

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true untuk port 465, false untuk 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendResetPasswordEmail(
    toEmail: string,
    resetToken: string
): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/forgot-password/reset?email=${encodeURIComponent(toEmail)}&token=${resetToken}`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6d7f53; margin: 0;">IDAMAN TSL</h1>
        <p style="color: #666; font-size: 14px;">Sistem Informasi Data Pemanfaatan TSL</p>
      </div>
      
      <h2 style="color: #333;">Reset Password</h2>
      
      <p style="color: #555; line-height: 1.6;">
        Kami menerima permintaan untuk mereset password akun Anda. 
        Klik tombol di bawah untuk membuat password baru:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background-color: #6d7f53; color: white; padding: 14px 28px; 
                  text-decoration: none; border-radius: 8px; font-weight: bold;
                  display: inline-block;">
          Reset Password
        </a>
      </div>
      
      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        Link ini akan kadaluarsa dalam <strong>15 menit</strong>. 
        Jika Anda tidak meminta reset password, abaikan email ini.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #aaa; font-size: 12px; text-align: center;">
        © 2026 BBKSDA Jawa Barat. Email ini dikirim otomatis, jangan membalas.
      </p>
    </div>
  `;

    await transporter.sendMail({
        from: process.env.SMTP_FROM || "IDAMAN TSL <noreply@bbksda-jabar.id>",
        to: toEmail,
        subject: "[IDAMAN TSL] Reset Password Anda",
        html,
    });
}
