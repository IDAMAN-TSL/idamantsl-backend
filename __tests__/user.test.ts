import request from "supertest";
import app from "../index";
import { db } from "../db/index";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
jest.mock("../db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
  sign: jest.fn(),
}));

const mockAdminToken = "Bearer mock-admin-token";

const mockAdmin = {
  id: 1,
  email: "admin@bbksda-jabar.id",
  role: "admin_pusat",
};

const mockUser = {
  id: 2,
  nama: "Budi Santoso",
  email: "budi@bbksda-jabar.id",
  role: "bidang_wilayah",
  wilayahId: 1,
  namaWilayah: "Bogor",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function mockJwtVerify() {
  (jwt.verify as jest.Mock).mockReturnValue(mockAdmin);
}

function mockSelect(returnValue: unknown) {
  const chain = {
    from: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(returnValue),
    orderBy: jest.fn().mockResolvedValue(returnValue),
  };
  (db.select as jest.Mock).mockReturnValue(chain);
  return chain;
}

function mockInsert(returnValue: unknown) {
  const chain = {
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(returnValue),
  };
  (db.insert as jest.Mock).mockReturnValue(chain);
  return chain;
}

function mockUpdate(returnValue: unknown = []) {
  const chain = {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(returnValue),
  };
  (db.update as jest.Mock).mockReturnValue(chain);
  return chain;
}

function mockDelete() {
  const chain = {
    where: jest.fn().mockResolvedValue(undefined),
  };
  (db.delete as jest.Mock).mockReturnValue(chain);
  return chain;
}
describe("User Controller", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify();
  });
  describe("GET /api/users", () => {
    it("200 - berhasil mengambil list semua user", async () => {
      mockSelect([mockUser]);

      const res = await request(app)
        .get("/api/users")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].email).toBe(mockUser.email);
    });

    it("200 - list kosong jika tidak ada user", async () => {
      mockSelect([]);

      const res = await request(app)
        .get("/api/users")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("500 - error server saat query gagal", async () => {
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .get("/api/users")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(500);
    });
  });
  describe("GET /api/users/:id", () => {
    it("200 - berhasil mengambil detail user", async () => {
      mockSelect([mockUser]);

      const res = await request(app)
        .get("/api/users/2")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(mockUser.id);
    });

    it("404 - user tidak ditemukan", async () => {
      mockSelect([]);

      const res = await request(app)
        .get("/api/users/999")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(404);
    });

    it("400 - ID tidak valid (bukan angka)", async () => {
      const res = await request(app)
        .get("/api/users/abc")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("ID tidak valid");
    });
  });
  describe("POST /api/users", () => {
    const validPayload = {
      nama: "Citra Dewi",
      email: "citra@bbksda-jabar.id",
      role: "bidang_wilayah",
      wilayahId: 1,
      password: "password123",
    };

    it("201 - berhasil membuat user baru", async () => {
      // Cek email duplikat → kosong
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_pass");
      mockInsert([{ id: 3, ...validPayload, createdAt: new Date().toISOString() }]);

      const res = await request(app)
        .post("/api/users")
        .set("Authorization", mockAdminToken)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("User berhasil dibuat");
    });

    it("400 - field wajib tidak lengkap", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", mockAdminToken)
        .send({ nama: "Test" });

      expect(res.status).toBe(400);
    });

    it("400 - role tidak valid", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", mockAdminToken)
        .send({ ...validPayload, role: "superadmin" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Role tidak valid");
    });

    it("400 - wilayahId kosong untuk role bidang_wilayah", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", mockAdminToken)
        .send({ ...validPayload, wilayahId: undefined });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("wilayahId wajib diisi untuk role ini");
    });

    it("409 - email sudah terdaftar", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 5 }]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);

      const res = await request(app)
        .post("/api/users")
        .set("Authorization", mockAdminToken)
        .send(validPayload);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Email sudah terdaftar");
    });

    it("500 - error server saat insert gagal", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      (db.insert as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .post("/api/users")
        .set("Authorization", mockAdminToken)
        .send(validPayload);

      expect(res.status).toBe(500);
    });
  });
  describe("PUT /api/users/:id", () => {
    it("200 - berhasil update user", async () => {
      // findUserById → ada
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn()
          .mockResolvedValueOnce([mockUser])   // findUserById
          .mockResolvedValueOnce([]),           // cek email duplikat
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);
      mockUpdate([{ ...mockUser, nama: "Budi Update" }]);

      const res = await request(app)
        .put("/api/users/2")
        .set("Authorization", mockAdminToken)
        .send({ nama: "Budi Update", email: "budi@bbksda-jabar.id" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User berhasil diperbarui");
    });

    it("404 - user tidak ditemukan saat update", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);

      const res = await request(app)
        .put("/api/users/999")
        .set("Authorization", mockAdminToken)
        .send({ nama: "Test" });

      expect(res.status).toBe(404);
    });

    it("400 - role tidak valid saat update", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);

      const res = await request(app)
        .put("/api/users/2")
        .set("Authorization", mockAdminToken)
        .send({ role: "invalid_role" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Role tidak valid");
    });

    it("409 - email sudah digunakan user lain", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn()
          .mockResolvedValueOnce([mockUser])   // findUserById
          .mockResolvedValueOnce([{ id: 99 }]),// email duplikat
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);

      const res = await request(app)
        .put("/api/users/2")
        .set("Authorization", mockAdminToken)
        .send({ email: "duplikat@bbksda-jabar.id" });

      expect(res.status).toBe(409);
    });

    it("400 - ID tidak valid saat update", async () => {
      const res = await request(app)
        .put("/api/users/abc")
        .set("Authorization", mockAdminToken)
        .send({ nama: "Test" });

      expect(res.status).toBe(400);
    });
  });
  describe("DELETE /api/users/:id", () => {
    it("200 - berhasil hapus user", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);
      mockDelete();

      const res = await request(app)
        .delete("/api/users/2")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User berhasil dihapus");
    });

    it("400 - tidak bisa hapus akun sendiri", async () => {
      // Admin ID = 1, coba hapus ID 1
      const res = await request(app)
        .delete("/api/users/1")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Tidak bisa menghapus akun sendiri");
    });

    it("404 - user tidak ditemukan saat hapus", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);

      const res = await request(app)
        .delete("/api/users/999")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(404);
    });

    it("400 - ID tidak valid saat hapus", async () => {
      const res = await request(app)
        .delete("/api/users/abc")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(400);
    });
  });
  describe("PUT /api/users/:id/reset-password", () => {
    it("200 - berhasil reset password", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);
      (bcrypt.hash as jest.Mock).mockResolvedValue("new_hashed_pass");
      mockUpdate();

      const res = await request(app)
        .put("/api/users/2/reset-password")
        .set("Authorization", mockAdminToken)
        .send({ newPassword: "newpassword123" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Password berhasil direset oleh admin");
    });

    it("400 - password baru kurang dari 8 karakter", async () => {
      const res = await request(app)
        .put("/api/users/2/reset-password")
        .set("Authorization", mockAdminToken)
        .send({ newPassword: "short" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Password baru minimal 8 karakter");
    });

    it("400 - newPassword tidak dikirim", async () => {
      const res = await request(app)
        .put("/api/users/2/reset-password")
        .set("Authorization", mockAdminToken)
        .send({});

      expect(res.status).toBe(400);
    });

    it("404 - user tidak ditemukan saat reset password", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);

      const res = await request(app)
        .put("/api/users/999/reset-password")
        .set("Authorization", mockAdminToken)
        .send({ newPassword: "newpassword123" });

      expect(res.status).toBe(404);
    });

    it("400 - ID tidak valid saat reset password", async () => {
      const res = await request(app)
        .put("/api/users/abc/reset-password")
        .set("Authorization", mockAdminToken)
        .send({ newPassword: "newpassword123" });

      expect(res.status).toBe(400);
    });
  });
});