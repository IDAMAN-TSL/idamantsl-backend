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

const mockWilayahBidang = {
  id: 1,
  namaWilayah: "Bogor",
  tipeWilayah: "bidang",
  nomorWilayah: 1,
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

/**
 * Membuat mock select chain yang mendukung multiple pemanggilan berurutan.
 * createUser memanggil db.select dua kali:
 *   1. Cek wilayah (jika wilayahId ada)
 *   2. Cek email duplikat
 * Gunakan helper ini agar setiap panggilan .limit() mengembalikan nilai berbeda.
 */
function mockSelectSequential(responses: unknown[]) {
  let callIndex = 0;
  (db.select as jest.Mock).mockImplementation(() => {
    const response = responses[callIndex] ?? [];
    callIndex++;
    return {
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue(response),
      limit: jest.fn().mockResolvedValue(response),
    };
  });
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
      // createUser memanggil db.select 2x:
      //   [0] cek wilayah → ada (tipeWilayah: "bidang")
      //   [1] cek email   → kosong (belum terdaftar)
      mockSelectSequential([
        [mockWilayahBidang],
        [],
      ]);
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

    it("400 - wilayahId bukan angka", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", mockAdminToken)
        .send({ ...validPayload, wilayahId: "abc" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("wilayahId harus berupa angka");
    });

    it("400 - wilayahId tidak ditemukan di database", async () => {
      // cek wilayah → tidak ditemukan
      mockSelectSequential([[]])

      const res = await request(app)
        .post("/api/users")
        .set("Authorization", mockAdminToken)
        .send(validPayload);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("wilayahId tidak ditemukan");
    });

    it("400 - role bidang_wilayah tapi wilayah bertipe seksi", async () => {
      // cek wilayah → ada tapi tipe seksi, bukan bidang
      mockSelectSequential([[{ ...mockWilayahBidang, tipeWilayah: "seksi" }]]);

      const res = await request(app)
        .post("/api/users")
        .set("Authorization", mockAdminToken)
        .send(validPayload); // role: "bidang_wilayah"

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("bidang_wilayah hanya boleh memilih wilayah bertipe bidang (ID 1-3)");
    });

    it("400 - role seksi_wilayah tapi wilayah bertipe bidang", async () => {
      // cek wilayah → ada tapi tipe bidang, bukan seksi
      mockSelectSequential([[{ ...mockWilayahBidang, tipeWilayah: "bidang" }]]);

      const res = await request(app)
        .post("/api/users")
        .set("Authorization", mockAdminToken)
        .send({ ...validPayload, role: "seksi_wilayah" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("seksi_wilayah hanya boleh memilih wilayah bertipe seksi (ID 4-9)");
    });

    it("409 - email sudah terdaftar", async () => {
      // createUser memanggil db.select 2x:
      //   [0] cek wilayah → ada
      //   [1] cek email   → sudah ada (duplikat)
      mockSelectSequential([
        [mockWilayahBidang],
        [{ id: 5 }],
      ]);

      const res = await request(app)
        .post("/api/users")
        .set("Authorization", mockAdminToken)
        .send(validPayload);

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Email sudah terdaftar");
    });

    it("500 - error server saat insert gagal", async () => {
      // createUser memanggil db.select 2x:
      //   [0] cek wilayah → ada
      //   [1] cek email   → kosong
      mockSelectSequential([
        [mockWilayahBidang],
        [],
      ]);
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
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn()
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([]),
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
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([{ id: 99 }]),
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

    it("400 - wilayahId bukan angka saat update", async () => {
      mockSelectSequential([[mockUser]]);

      const res = await request(app)
        .put("/api/users/2")
        .set("Authorization", mockAdminToken)
        .send({ wilayahId: "bukan-angka" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("wilayahId harus berupa angka");
    });

    it("400 - wilayahId tidak ditemukan saat update", async () => {
      // [0] findUserById → ada, [1] cek wilayah → kosong
      mockSelectSequential([[mockUser], []]);

      const res = await request(app)
        .put("/api/users/2")
        .set("Authorization", mockAdminToken)
        .send({ wilayahId: 99 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("wilayahId tidak ditemukan");
    });

    it("400 - role bidang_wilayah tapi wilayah bertipe seksi saat update", async () => {
      // [0] findUserById → ada, [1] cek wilayah → tipe seksi
      mockSelectSequential([
        [mockUser],
        [{ ...mockWilayahBidang, tipeWilayah: "seksi" }],
      ]);

      const res = await request(app)
        .put("/api/users/2")
        .set("Authorization", mockAdminToken)
        .send({ wilayahId: 1, role: "bidang_wilayah" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("bidang_wilayah hanya boleh memilih wilayah bertipe bidang (ID 1-3)");
    });

    it("400 - role seksi_wilayah tapi wilayah bertipe bidang saat update", async () => {
      // [0] findUserById → ada, [1] cek wilayah → tipe bidang
      mockSelectSequential([
        [{ ...mockUser, role: "seksi_wilayah" }],
        [{ ...mockWilayahBidang, tipeWilayah: "bidang" }],
      ]);

      const res = await request(app)
        .put("/api/users/2")
        .set("Authorization", mockAdminToken)
        .send({ wilayahId: 1, role: "seksi_wilayah" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("seksi_wilayah hanya boleh memilih wilayah bertipe seksi (ID 4-9)");
    });

    it("500 - error server saat update gagal", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn()
          .mockResolvedValueOnce([mockUser])
          .mockResolvedValueOnce([]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);
      (db.update as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .put("/api/users/2")
        .set("Authorization", mockAdminToken)
        .send({ nama: "Error Test", email: "error@test.id" });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal memperbarui user");
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
      mockUpdate();
      mockDelete();

      const res = await request(app)
        .delete("/api/users/2")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("User berhasil dihapus");
    });

    it("400 - tidak bisa hapus akun sendiri", async () => {
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

    it("500 - error server saat hapus gagal", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);
      (db.update as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .delete("/api/users/2")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal menghapus user");
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

    it("500 - error server saat reset password gagal", async () => {
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockUser]),
      };
      (db.select as jest.Mock).mockReturnValue(selectChain);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      (db.update as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .put("/api/users/2/reset-password")
        .set("Authorization", mockAdminToken)
        .send({ newPassword: "newpassword123" });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal mereset password");
    });
  });
});