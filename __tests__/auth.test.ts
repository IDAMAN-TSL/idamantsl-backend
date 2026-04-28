import request from "supertest";
import app from "../index";
import { db } from "../db/index";

jest.mock("../db/index", () => ({
  db: {
    query: {
      users: {
        findFirst: jest.fn(),
      },
    },
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(),
      })),
    })),
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "mocked_token"),
  verify: jest.fn(),
  TokenExpiredError: class TokenExpiredError extends Error {
    constructor() {
      super("jwt expired");
      this.name = "TokenExpiredError";
    }
  },
  JsonWebTokenError: class JsonWebTokenError extends Error {
    constructor() {
      super("invalid token");
      this.name = "JsonWebTokenError";
    }
  },
}));

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const mockDb = db as jest.Mocked<typeof db>;

describe("Auth Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("berhasil login dengan kredensial valid", async () => {
      (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        nama: "Admin BBKSDA Jabar",
        email: "admin@bbksda-jabar.id",
        password: "hashed_password",
        role: "admin_pusat",
        wilayahId: null,
        wilayah: null,
        isActive: true,
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@bbksda-jabar.id", password: "admin123" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("token");
    });

    it("gagal login jika email tidak diisi", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ password: "admin123" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Email dan password wajib diisi");
    });

    it("gagal login jika password tidak diisi", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@bbksda-jabar.id" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("gagal login jika user tidak ditemukan", async () => {
      (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "salah@email.com", password: "admin123" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("gagal login jika password salah", async () => {
      (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: "admin@bbksda-jabar.id",
        password: "hashed_password",
        isActive: true,
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@bbksda-jabar.id", password: "salah" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("gagal login jika akun tidak aktif", async () => {
      (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: "admin@bbksda-jabar.id",
        password: "hashed_password",
        isActive: false,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@bbksda-jabar.id", password: "admin123" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("berhasil logout dengan token valid", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({
        id: 1,
        email: "admin@bbksda-jabar.id",
        role: "admin_pusat",
        wilayahId: null,
      });

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("gagal logout tanpa token", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("gagal logout dengan token tidak valid", async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        const error = new Error("invalid token");
        error.name = "JsonWebTokenError";
        throw error;
      });

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", "Bearer tokenpalsu");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/forgot-password", () => {
    it("berhasil request reset password dengan email terdaftar", async () => {
      (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: "admin@bbksda-jabar.id",
      });

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "admin@bbksda-jabar.id" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("tetap return 200 meski email tidak terdaftar", async () => {
      (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "tidakterdaftar@email.com" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("gagal jika email tidak diisi", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("gagal jika field tidak lengkap", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({ email: "admin@bbksda-jabar.id" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Semua field wajib diisi");
    });

    it("gagal jika password tidak cocok", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          email: "admin@bbksda-jabar.id",
          token: "123456",
          newPassword: "password123",
          confirmPassword: "passwordbeda",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Password baru dan konfirmasi password tidak sama"
      );
    });

    it("gagal jika password kurang dari 8 karakter", async () => {
      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          email: "admin@bbksda-jabar.id",
          token: "123456",
          newPassword: "abc",
          confirmPassword: "abc",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Password minimal 8 karakter");
    });

    it("gagal jika token tidak valid", async () => {
      (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: "admin@bbksda-jabar.id",
        resetToken: "654321",
        resetTokenExpiry: new Date(Date.now() + 10 * 60 * 1000),
      });

      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          email: "admin@bbksda-jabar.id",
          token: "000000",
          newPassword: "passwordbaru123",
          confirmPassword: "passwordbaru123",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("gagal jika token expired", async () => {
      (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: "admin@bbksda-jabar.id",
        resetToken: "123456",
        resetTokenExpiry: new Date(Date.now() - 1000),
      });

      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          email: "admin@bbksda-jabar.id",
          token: "123456",
          newPassword: "passwordbaru123",
          confirmPassword: "passwordbaru123",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Token sudah kadaluarsa, silakan request ulang"
      );
    });

    it("berhasil reset password dengan token valid", async () => {
      (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: "admin@bbksda-jabar.id",
        resetToken: "123456",
        resetTokenExpiry: new Date(Date.now() + 10 * 60 * 1000),
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue("new_hashed_password");

      const res = await request(app)
        .post("/api/auth/reset-password")
        .send({
          email: "admin@bbksda-jabar.id",
          token: "123456",
          newPassword: "passwordbaru123",
          confirmPassword: "passwordbaru123",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});