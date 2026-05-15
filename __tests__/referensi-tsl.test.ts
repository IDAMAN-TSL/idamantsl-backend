import request from "supertest";
import app from "../index";
import { db } from "../db";
import jwt from "jsonwebtoken";

jest.mock("../db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
  sign: jest.fn(),
}));

const mockAdmin  = { id: 1, role: "admin_pusat" };
const mockBidang = { id: 5, role: "bidang_wilayah" };
const mockSeksi  = { id: 6, role: "seksi_wilayah" };

const mockReferensi = {
  id: 1,
  nomor: "001",
  namaDaerah: "Harimau Jawa",
  jenis: "satwa_liar",
  kingdom: "Animalia",
  divisi: null,
  kelas: "Mammalia",
  ordo: "Carnivora",
  famili: "Felidae",
  genus: "Panthera",
  spesies: "Panthera tigris sondaica",
  statusPerlindunganNasional: "dilindungi",
  statusCites: "apendiks_i",
  statusIucn: "punah_di_alam",
  statusVerifikasi: "disetujui",
  catatanVerifikasi: null,
  createdBy: 1,
  namaInputor: "Admin BBKSDA Jabar",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const TOKEN = "Bearer mock-token";

function setUser(user: typeof mockAdmin | typeof mockBidang | typeof mockSeksi) {
  (jwt.verify as jest.Mock).mockReturnValue(user);
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
  const chain = { where: jest.fn().mockResolvedValue(undefined) };
  (db.delete as jest.Mock).mockReturnValue(chain);
  return chain;
}

describe("Referensi TSL Controller", () => {

  beforeEach(() => jest.clearAllMocks());

  // ─── GET /api/referensi-tsl ───────────────────────────────────────────────

  describe("GET /api/referensi-tsl", () => {
    it("200 - semua role bisa akses list", async () => {
      setUser(mockSeksi);
      mockSelect([mockReferensi]);

      const res = await request(app)
        .get("/api/referensi-tsl")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].namaDaerah).toBe("Harimau Jawa");
    });

    it("200 - list kosong", async () => {
      setUser(mockAdmin);
      mockSelect([]);

      const res = await request(app)
        .get("/api/referensi-tsl")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("200 - filter dengan ?statusVerifikasi=pending", async () => {
      setUser(mockAdmin);
      mockSelect([{ ...mockReferensi, statusVerifikasi: "pending" }]);

      const res = await request(app)
        .get("/api/referensi-tsl?statusVerifikasi=pending")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("200 - filter dengan ?statusVerifikasi=disetujui", async () => {
      setUser(mockAdmin);
      mockSelect([mockReferensi]);

      const res = await request(app)
        .get("/api/referensi-tsl?statusVerifikasi=disetujui")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
    });

    it("200 - filter dengan ?statusVerifikasi=ditolak", async () => {
      setUser(mockAdmin);
      mockSelect([]);

      const res = await request(app)
        .get("/api/referensi-tsl?statusVerifikasi=ditolak")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("400 - ?statusVerifikasi tidak valid", async () => {
      setUser(mockAdmin);

      const res = await request(app)
        .get("/api/referensi-tsl?statusVerifikasi=tidak_valid")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("statusVerifikasi tidak valid. Gunakan: pending, disetujui, atau ditolak");
    });

    it("500 - error server", async () => {
      setUser(mockAdmin);
      (db.select as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

      const res = await request(app)
        .get("/api/referensi-tsl")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(500);
    });

    it("401 - tanpa token", async () => {
      const res = await request(app).get("/api/referensi-tsl");
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /api/referensi-tsl/:id ───────────────────────────────────────────

  describe("GET /api/referensi-tsl/:id", () => {
    it("200 - berhasil ambil detail", async () => {
      setUser(mockSeksi);
      mockSelect([mockReferensi]);

      const res = await request(app)
        .get("/api/referensi-tsl/1")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(1);
    });

    it("404 - data tidak ditemukan", async () => {
      setUser(mockAdmin);
      mockSelect([]);

      const res = await request(app)
        .get("/api/referensi-tsl/999")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(404);
    });

    it("400 - ID tidak valid", async () => {
      setUser(mockAdmin);

      const res = await request(app)
        .get("/api/referensi-tsl/abc")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("ID tidak valid");
    });
  });

  // ─── POST /api/referensi-tsl ──────────────────────────────────────────────

  describe("POST /api/referensi-tsl", () => {
    const validPayload = {
      namaDaerah: "Elang Jawa",
      jenis: "satwa_liar",
      spesies: "Nisaetus bartelsi",
      statusPerlindunganNasional: "dilindungi",
      statusCites: "apendiks_i",
      statusIucn: "terancam_punah",
    };

    it("201 - admin_pusat tambah data → langsung disetujui", async () => {
      setUser(mockAdmin);
      mockInsert([{ ...validPayload, id: 2, statusVerifikasi: "disetujui", createdBy: 1 }]);

      const res = await request(app)
        .post("/api/referensi-tsl")
        .set("Authorization", TOKEN)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.statusVerifikasi).toBe("disetujui");
    });

    it("201 - bidang_wilayah tambah data → statusVerifikasi pending", async () => {
      setUser(mockBidang);
      mockInsert([{ ...validPayload, id: 3, statusVerifikasi: "pending", createdBy: 5 }]);

      const res = await request(app)
        .post("/api/referensi-tsl")
        .set("Authorization", TOKEN)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.data.statusVerifikasi).toBe("pending");
    });

    it("400 - namaDaerah tidak diisi", async () => {
      setUser(mockAdmin);

      const res = await request(app)
        .post("/api/referensi-tsl")
        .set("Authorization", TOKEN)
        .send({ jenis: "satwa_liar" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("namaDaerah dan jenis wajib diisi");
    });

    it("400 - jenis tidak valid", async () => {
      setUser(mockAdmin);

      const res = await request(app)
        .post("/api/referensi-tsl")
        .set("Authorization", TOKEN)
        .send({ namaDaerah: "Test", jenis: "hewan_peliharaan" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Jenis TSL tidak valid");
    });

    it("403 - seksi_wilayah tidak bisa POST", async () => {
      setUser(mockSeksi);

      const res = await request(app)
        .post("/api/referensi-tsl")
        .set("Authorization", TOKEN)
        .send(validPayload);

      expect(res.status).toBe(403);
    });

    it("500 - error server saat insert", async () => {
      setUser(mockAdmin);
      (db.insert as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

      const res = await request(app)
        .post("/api/referensi-tsl")
        .set("Authorization", TOKEN)
        .send(validPayload);

      expect(res.status).toBe(500);
    });
  });

  // ─── PUT /api/referensi-tsl/:id ───────────────────────────────────────────

  describe("PUT /api/referensi-tsl/:id", () => {

    it("200 - admin_pusat berhasil update", async () => {
      setUser(mockAdmin);
      mockSelect([mockReferensi]);
      mockUpdate([{ ...mockReferensi, namaDaerah: "Harimau Jawa Updated" }]);

      const res = await request(app)
        .put("/api/referensi-tsl/1")
        .set("Authorization", TOKEN)
        .send({ namaDaerah: "Harimau Jawa Updated" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Referensi TSL berhasil diperbarui");
    });

    it("200 - bidang_wilayah update data apapun → masuk pendingChanges & status pending", async () => {
      setUser(mockBidang);
      // Controller tidak cek createdBy untuk bidang_wilayah — semua data bisa diajukan
      mockSelect([{ ...mockReferensi, createdBy: 1, statusVerifikasi: "disetujui" }]);
      mockUpdate([{ ...mockReferensi, createdBy: 1, statusVerifikasi: "pending" }]);

      const res = await request(app)
        .put("/api/referensi-tsl/1")
        .set("Authorization", TOKEN)
        .send({ namaDaerah: "Update Oleh Bidang" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Perubahan telah diajukan, menunggu persetujuan admin");
      expect(res.body.data.statusVerifikasi).toBe("pending");
    });

    it("200 - bidang_wilayah update data milik sendiri → masuk pendingChanges & status pending", async () => {
      setUser(mockBidang);
      mockSelect([{ ...mockReferensi, createdBy: 5, statusVerifikasi: "disetujui" }]);
      mockUpdate([{ ...mockReferensi, createdBy: 5, statusVerifikasi: "pending" }]);

      const res = await request(app)
        .put("/api/referensi-tsl/1")
        .set("Authorization", TOKEN)
        .send({ namaDaerah: "Update Milik Sendiri" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Perubahan telah diajukan, menunggu persetujuan admin");
      expect(res.body.data.statusVerifikasi).toBe("pending");
    });

    it("200 - bidang_wilayah update data yang statusVerifikasi pending → tetap diproses", async () => {
      // Controller tidak memblokir update meski statusVerifikasi sudah pending
      setUser(mockBidang);
      mockSelect([{ ...mockReferensi, createdBy: 5, statusVerifikasi: "pending" }]);
      mockUpdate([{ ...mockReferensi, createdBy: 5, statusVerifikasi: "pending" }]);

      const res = await request(app)
        .put("/api/referensi-tsl/1")
        .set("Authorization", TOKEN)
        .send({ namaDaerah: "Update Saat Pending" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Perubahan telah diajukan, menunggu persetujuan admin");
    });

    it("200 - bidang_wilayah update data yang statusVerifikasi ditolak → diajukan ulang", async () => {
      // Controller tidak memblokir update meski statusVerifikasi ditolak
      setUser(mockBidang);
      mockSelect([{ ...mockReferensi, createdBy: 5, statusVerifikasi: "ditolak", catatanVerifikasi: "Data tidak lengkap" }]);
      mockUpdate([{ ...mockReferensi, createdBy: 5, statusVerifikasi: "pending" }]);

      const res = await request(app)
        .put("/api/referensi-tsl/1")
        .set("Authorization", TOKEN)
        .send({ namaDaerah: "Update Setelah Ditolak" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Perubahan telah diajukan, menunggu persetujuan admin");
    });

    it("400 - bidang_wilayah update dengan jenis tidak valid", async () => {
      setUser(mockBidang);
      mockSelect([{ ...mockReferensi, createdBy: 5, statusVerifikasi: "disetujui" }]);

      const res = await request(app)
        .put("/api/referensi-tsl/1")
        .set("Authorization", TOKEN)
        .send({ jenis: "tidak_valid" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Jenis TSL tidak valid");
    });

    it("200 - bidang_wilayah update tanpa field jenis → jenis tidak divalidasi, tetap pending", async () => {
      // Menutup branch fields.jenis falsy pada kondisi: if (fields.jenis && !VALID_JENIS.includes(fields.jenis))
      setUser(mockBidang);
      mockSelect([{ ...mockReferensi, createdBy: 5, statusVerifikasi: "disetujui" }]);
      mockUpdate([{ ...mockReferensi, createdBy: 5, statusVerifikasi: "pending" }]);

      const res = await request(app)
        .put("/api/referensi-tsl/1")
        .set("Authorization", TOKEN)
        .send({ kingdom: "Plantae" }); // tidak ada field jenis

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Perubahan telah diajukan, menunggu persetujuan admin");
    });

    it("400 - admin_pusat update dengan jenis tidak valid", async () => {
      setUser(mockAdmin);
      mockSelect([mockReferensi]);

      const res = await request(app)
        .put("/api/referensi-tsl/1")
        .set("Authorization", TOKEN)
        .send({ jenis: "tidak_valid" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Jenis TSL tidak valid");
    });

    it("200 - admin_pusat update tanpa field jenis → jenis tidak divalidasi", async () => {
      // Menutup branch fields.jenis falsy pada kondisi: if (fields.jenis && !VALID_JENIS.includes(fields.jenis))
      setUser(mockAdmin);
      mockSelect([mockReferensi]);
      mockUpdate([{ ...mockReferensi, kingdom: "Plantae" }]);

      const res = await request(app)
        .put("/api/referensi-tsl/1")
        .set("Authorization", TOKEN)
        .send({ kingdom: "Plantae" }); // tidak ada field jenis

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Referensi TSL berhasil diperbarui");
    });

    it("404 - data tidak ditemukan saat update", async () => {
      setUser(mockAdmin);
      mockSelect([]);

      const res = await request(app)
        .put("/api/referensi-tsl/999")
        .set("Authorization", TOKEN)
        .send({ namaDaerah: "Test" });

      expect(res.status).toBe(404);
    });

    it("400 - ID tidak valid saat update", async () => {
      setUser(mockAdmin);

      const res = await request(app)
        .put("/api/referensi-tsl/abc")
        .set("Authorization", TOKEN)
        .send({ namaDaerah: "Test" });

      expect(res.status).toBe(400);
    });

    it("500 - error server saat update", async () => {
      setUser(mockAdmin);
      (db.select as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

      const res = await request(app)
        .put("/api/referensi-tsl/1")
        .set("Authorization", TOKEN)
        .send({ namaDaerah: "Test" });

      expect(res.status).toBe(500);
    });
  });

  // ─── DELETE /api/referensi-tsl/:id ───────────────────────────────────────

  describe("DELETE /api/referensi-tsl/:id", () => {

    it("200 - admin_pusat berhasil hapus", async () => {
      setUser(mockAdmin);
      mockSelect([mockReferensi]);
      mockDelete();

      const res = await request(app)
        .delete("/api/referensi-tsl/1")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Referensi TSL berhasil dihapus");
    });

    it("200 - bidang_wilayah hapus data milik sendiri → jadi pending delete", async () => {
      // Controller tidak cek createdBy — semua bidang_wilayah langsung set pendingChanges._action: delete
      setUser(mockBidang);
      mockSelect([{ ...mockReferensi, createdBy: 5 }]);
      mockUpdate();

      const res = await request(app)
        .delete("/api/referensi-tsl/1")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Pengajuan penghapusan telah dikirim, menunggu persetujuan admin");
    });

    it("200 - bidang_wilayah hapus data milik orang lain → jadi pending delete", async () => {
      // Controller tidak membedakan createdBy — semua bidang_wilayah masuk alur yang sama
      setUser(mockBidang);
      mockSelect([{ ...mockReferensi, createdBy: 1 }]);
      mockUpdate();

      const res = await request(app)
        .delete("/api/referensi-tsl/1")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Pengajuan penghapusan telah dikirim, menunggu persetujuan admin");
    });

    it("200 - bidang_wilayah hapus data yang statusVerifikasi pending → tetap diproses", async () => {
      // Controller tidak memblokir hapus meski statusVerifikasi sudah pending
      setUser(mockBidang);
      mockSelect([{ ...mockReferensi, createdBy: 5, statusVerifikasi: "pending" }]);
      mockUpdate();

      const res = await request(app)
        .delete("/api/referensi-tsl/1")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Pengajuan penghapusan telah dikirim, menunggu persetujuan admin");
    });

    it("200 - bidang_wilayah hapus data yang statusVerifikasi ditolak → diajukan ulang", async () => {
      // Controller tidak memblokir hapus meski statusVerifikasi ditolak
      setUser(mockBidang);
      mockSelect([{ ...mockReferensi, createdBy: 5, statusVerifikasi: "ditolak", catatanVerifikasi: "Data tidak valid" }]);
      mockUpdate();

      const res = await request(app)
        .delete("/api/referensi-tsl/1")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Pengajuan penghapusan telah dikirim, menunggu persetujuan admin");
    });

    it("403 - seksi_wilayah tidak bisa DELETE", async () => {
      setUser(mockSeksi);

      const res = await request(app)
        .delete("/api/referensi-tsl/1")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(403);
    });

    it("404 - data tidak ditemukan saat hapus", async () => {
      setUser(mockAdmin);
      mockSelect([]);

      const res = await request(app)
        .delete("/api/referensi-tsl/999")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(404);
    });

    it("400 - ID tidak valid saat hapus", async () => {
      setUser(mockAdmin);

      const res = await request(app)
        .delete("/api/referensi-tsl/abc")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(400);
    });

    it("500 - error server saat delete", async () => {
      setUser(mockAdmin);
      (db.select as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

      const res = await request(app)
        .delete("/api/referensi-tsl/1")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(500);
    });
  });

  // ─── DELETE /api/referensi-tsl/bulk ──────────────────────────────────

  describe("DELETE /api/referensi-tsl/bulk", () => {

    it("200 - admin_pusat berhasil bulk delete", async () => {
      setUser(mockAdmin);
      (db.delete as jest.Mock).mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const res = await request(app)
        .delete("/api/referensi-tsl/bulk")
        .set("Authorization", TOKEN)
        .send({ ids: [1, 2, 3] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("3 data referensi TSL berhasil dihapus");
    });

    it("400 - bulk delete tanpa ids", async () => {
      setUser(mockAdmin);

      const res = await request(app)
        .delete("/api/referensi-tsl/bulk")
        .set("Authorization", TOKEN)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("ids wajib diisi");
    });

    it("400 - bulk delete dengan ids bukan array", async () => {
      setUser(mockAdmin);

      const res = await request(app)
        .delete("/api/referensi-tsl/bulk")
        .set("Authorization", TOKEN)
        .send({ ids: "not-array" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("400 - bulk delete dengan array kosong", async () => {
      setUser(mockAdmin);

      const res = await request(app)
        .delete("/api/referensi-tsl/bulk")
        .set("Authorization", TOKEN)
        .send({ ids: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("400 - bulk delete dengan id tidak valid", async () => {
      setUser(mockAdmin);

      const res = await request(app)
        .delete("/api/referensi-tsl/bulk")
        .set("Authorization", TOKEN)
        .send({ ids: [1, "invalid", 3] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Semua id harus berupa angka");
    });

    it("403 - bidang_wilayah gagal bulk delete jika ada data milik orang lain", async () => {
      setUser(mockBidang);
      const mockChain1 = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 1, createdBy: 5 }]),
      };
      const mockChain2 = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 2, createdBy: 1 }]),
      };
      (db.select as jest.Mock)
        .mockReturnValueOnce(mockChain1)
        .mockReturnValueOnce(mockChain2);

      const res = await request(app)
        .delete("/api/referensi-tsl/bulk")
        .set("Authorization", TOKEN)
        .send({ ids: [1, 2] });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("tidak ditemukan atau bukan milik Anda");
    });

    it("200 - bidang_wilayah berhasil bulk delete data milik sendiri", async () => {
      setUser(mockBidang);
      mockSelect([
        { id: 1, createdBy: 5 },
        { id: 2, createdBy: 5 },
      ]);
      (db.delete as jest.Mock).mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const res = await request(app)
        .delete("/api/referensi-tsl/bulk")
        .set("Authorization", TOKEN)
        .send({ ids: [1, 2] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("2 data referensi TSL berhasil dihapus");
    });

    it("500 - error server saat bulk delete", async () => {
      setUser(mockAdmin);
      (db.delete as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

      const res = await request(app)
        .delete("/api/referensi-tsl/bulk")
        .set("Authorization", TOKEN)
        .send({ ids: [1, 2] });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });});
