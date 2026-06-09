import { sendResetPasswordEmail } from "../src/helpers/mailer";
import nodemailer from "nodemailer";

// Mock nodemailer
jest.mock("nodemailer", () => {
    const sendMailMock = jest.fn().mockResolvedValue(true);
    return {
        createTransport: jest.fn(() => ({
            sendMail: sendMailMock,
        })),
    };
});

describe("Mailer Helper", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset env sebelum setiap test
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        // Kembalikan env asli
        process.env = originalEnv;
    });

    it("berhasil memanggil fungsi sendMail dengan parameter yang benar", async () => {
        const toEmail = "test@example.com";
        const resetToken = "dummy_token_123";

        // Set env vars sementara untuk test ini
        process.env.FRONTEND_URL = "http://localhost:3000";
        process.env.SMTP_FROM = "Test Sender <noreply@test.com>";

        await sendResetPasswordEmail(toEmail, resetToken);

        // Akses fungsi mock dari transporter yang baru dibuat
        const transporter = nodemailer.createTransport();
        const sendMailMock = (transporter as any).sendMail;

        expect(sendMailMock).toHaveBeenCalledTimes(1);
        
        // Memastikan parameter yang dilempar ke sendMail sudah tepat
        const callArg = sendMailMock.mock.calls[0][0];
        
        expect(callArg.from).toBe("Test Sender <noreply@test.com>");
        expect(callArg.to).toBe(toEmail);
        expect(callArg.subject).toBe("[IDAMAN TSL] Reset Password Anda");
        
        // Memastikan HTML memuat link reset yang mengandung email dan token
        expect(callArg.html).toContain(encodeURIComponent(toEmail));
        expect(callArg.html).toContain(resetToken);
        expect(callArg.html).toContain("http://localhost:3000/forgot-password/reset");
    });

    it("menggunakan nilai default jika environment variable tidak diset", async () => {
        const toEmail = "test2@example.com";
        const resetToken = "token_456";

        // Hapus environment variable untuk melihat fallback ke nilai default
        delete process.env.FRONTEND_URL;
        delete process.env.SMTP_FROM;

        await sendResetPasswordEmail(toEmail, resetToken);

        const transporter = nodemailer.createTransport();
        const sendMailMock = (transporter as any).sendMail;

        const callArg = sendMailMock.mock.calls[0][0];

        // Harus menggunakan fallback default SMTP_FROM
        expect(callArg.from).toBe("IDAMAN TSL <noreply@bbksda-jabar.id>");
        
        // Harus menggunakan fallback FRONTEND_URL default http://localhost:3000
        expect(callArg.html).toContain("http://localhost:3000/forgot-password/reset");
    });
});
