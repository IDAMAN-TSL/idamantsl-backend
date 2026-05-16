import request from "supertest";
import app from "../index";
import { db } from "../db/index";

jest.mock("../db/index", () => ({
  db: {
    query: {
      penangkaran: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    },
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: jest.fn(),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      where: jest.fn(),
    })),
  },
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

jest.mock("../src/helpers/azure-storage", () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));

import { uploadFile, deleteFile } from "../src/helpers/azure-storage";

import jwt from "jsonwebtoken";
const mockDb = db as jest.Mocked<typeof db>;

const mockAdminToken = "mocked_admin_token";
const mockAdminUser = {
  id: 1,
  email: "admin@bbksda-jabar.id",
  role: "admin_pusat",
  wilayahId: null,
};

const mockBidangToken = "mocked_bidang_token";
const mockBidangUser = {
  id: 2,
  email: "bidang@bbksda-jabar.id",
  role: "bidang_wilayah",
  wilayahId: 1,
};

const mockSeksiToken = "mocked_seksi_token";
const mockSeksiUser = {
  id: 3,
  email: "seksi@bbksda-jabar.id",
  role: "seksi_wilayah",
  wilayahId: 4,
};

const mockPenangkaran = {
  id: 1,
  nomor: "001",
  namaPenangkaran: "Penangkaran Rusa Timor",
  nomorSk: "SK.1010/KSDAE/2024",
  tanggalSk: new Date("2024-01-01"),
  penerbit: "Direjen KSDAE",
  akhirMasaBerlaku: new Date("2027-01-01"),
  namaDirektur: "Budi Santoso",
  nomorTelepon: "08123456789",
  bidangWilayahId: 1,
  seksiWilayahId: 4,
  alamatKantor: "Jl. Contoh No. 1, Bogor",
  alamatPenangkaran: "Jl. Penangkaran No. 2, Bogor",
  koordinatLokasi: "-6.595038, 106.816635",
  tslId: null,
  statusVerifikasi: "disetujui",
  catatanVerifikasi: null,
  createdBy: 1,
  updatedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBodyPenangkaran = {
  namaPenangkaran: "Penangkaran Rusa Timor",
  nomor: "001",
  nomorSk: "SK.1010/KSDAE/2024",
  tanggalSk: "2024-01-01",
  penerbit: "Direjen KSDAE",
  akhirMasaBerlaku: "2027-01-01",
  namaDirektur: "Budi Santoso",
  nomorTelepon: "08123456789",
  bidangWilayahId: 1,
  seksiWilayahId: 4,
  alamatKantor: "Jl. Contoh No. 1, Bogor",
  alamatPenangkaran: "Jl. Penangkaran No. 2, Bogor",
  koordinatLokasi: "-6.595038, 106.816635",
  tslId: null,
};

describe("Penangkaran Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/penangkaran", () => {
    it("berhasil ambil semua data sebagai admin", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findMany as jest.Mock).mockResolvedValue([
        mockPenangkaran,
      ]);

      const res = await request(app)
        .get("/api/penangkaran")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it("berhasil ambil semua data sebagai bidang wilayah", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);
      (mockDb.query.penangkaran.findMany as jest.Mock).mockResolvedValue([
        mockPenangkaran,
      ]);

      const res = await request(app)
        .get("/api/penangkaran")
        .set("Authorization", `Bearer ${mockBidangToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("berhasil ambil semua data sebagai seksi wilayah", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockSeksiUser);
      (mockDb.query.penangkaran.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get("/api/penangkaran")
        .set("Authorization", `Bearer ${mockSeksiToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("berhasil ambil data dengan filter status=pending", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findMany as jest.Mock).mockResolvedValue([
        { ...mockPenangkaran, statusVerifikasi: "pending" },
      ]);

      const res = await request(app)
        .get("/api/penangkaran?status=pending")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("berhasil ambil data dengan filter status=disetujui", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findMany as jest.Mock).mockResolvedValue([
        mockPenangkaran,
      ]);

      const res = await request(app)
        .get("/api/penangkaran?status=disetujui")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("berhasil ambil data dengan filter status=ditolak", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get("/api/penangkaran?status=ditolak")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("gagal dengan status tidak valid", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .get("/api/penangkaran?status=invalid_status")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Status tidak valid");
    });

    it("gagal tanpa token", async () => {
      const res = await request(app).get("/api/penangkaran");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("gagal saat server error", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findMany as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      const res = await request(app)
        .get("/api/penangkaran")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
  describe("GET /api/penangkaran/:id", () => {
    it("berhasil ambil data berdasarkan id", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue(
        mockPenangkaran
      );

      const res = await request(app)
        .get("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
    });

    it("return 404 jika data tidak ditemukan", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get("/api/penangkaran/999")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("gagal saat server error di get by id", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      const res = await request(app)
        .get("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
  describe("POST /api/penangkaran", () => {
    it("berhasil tambah data sebagai admin pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockPenangkaran]),
        }),
      });

      const res = await request(app)
        .post("/api/penangkaran")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send(mockBodyPenangkaran);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it("berhasil tambah data sebagai bidang wilayah - status pending", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);
      (mockDb.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            { ...mockPenangkaran, statusVerifikasi: "pending", createdBy: 2 },
          ]),
        }),
      });

      const res = await request(app)
        .post("/api/penangkaran")
        .set("Authorization", `Bearer ${mockBidangToken}`)
        .send(mockBodyPenangkaran);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("menunggu verifikasi");
    });

    it("gagal tambah data jika nama penangkaran kosong", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/penangkaran")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({ nomor: "001" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Nama penangkaran wajib diisi");
    });

    it("gagal tambah data sebagai seksi wilayah", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockSeksiUser);

      const res = await request(app)
        .post("/api/penangkaran")
        .set("Authorization", `Bearer ${mockSeksiToken}`)
        .send(mockBodyPenangkaran);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("gagal tambah data tanpa token", async () => {
      const res = await request(app)
        .post("/api/penangkaran")
        .send(mockBodyPenangkaran);

      expect(res.status).toBe(401);
    });

    it("gagal saat server error di POST", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.insert as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .post("/api/penangkaran")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send(mockBodyPenangkaran);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
  describe("PUT /api/penangkaran/:id", () => {
    it("berhasil update data sebagai admin pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue(
        mockPenangkaran
      );
      (mockDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest
              .fn()
              .mockResolvedValue([
                { ...mockPenangkaran, namaPenangkaran: "Penangkaran Updated" },
              ]),
          }),
        }),
      });

      const res = await request(app)
        .put("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({ ...mockBodyPenangkaran, namaPenangkaran: "Penangkaran Updated" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("gagal update jika data tidak ditemukan", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .put("/api/penangkaran/999")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send(mockBodyPenangkaran);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("bidang_wilayah update data milik orang lain → masuk pendingChanges (status pending)", async () => {
      // Aturan baru: bidang_wilayah boleh ajukan perubahan untuk data manapun.
      // Hasilnya bukan 403, melainkan 200 dengan status pending.
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue(
        mockPenangkaran
      );
      (mockDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              { ...mockPenangkaran, statusVerifikasi: "pending" },
            ]),
          }),
        }),
      });

      const res = await request(app)
        .put("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockBidangToken}`)
        .send(mockBodyPenangkaran);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("menunggu persetujuan Admin Pusat");
    });

    it("gagal update sebagai seksi wilayah", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockSeksiUser);

      const res = await request(app)
        .put("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockSeksiToken}`)
        .send(mockBodyPenangkaran);

      expect(res.status).toBe(403);
    });

    it("berhasil update data milik sendiri sebagai bidang wilayah", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue({
        ...mockPenangkaran,
        createdBy: 2,
      });
      (mockDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              { ...mockPenangkaran, createdBy: 2, statusVerifikasi: "pending" },
            ]),
          }),
        }),
      });

      const res = await request(app)
        .put("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockBidangToken}`)
        .send(mockBodyPenangkaran);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("bidang_wilayah update dengan upload file → fileSk masuk pendingChanges", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue(
        mockPenangkaran
      );
      (uploadFile as jest.Mock).mockResolvedValue("https://azure/file-baru.pdf");

      const setSpy = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            { ...mockPenangkaran, statusVerifikasi: "pending" },
          ]),
        }),
      });
      (mockDb.update as jest.Mock).mockReturnValue({ set: setSpy });

      const res = await request(app)
        .put("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockBidangToken}`)
        .field("namaPenangkaran", "Penangkaran Test")
        .attach("fileSk", Buffer.from("dummy pdf"), {
          filename: "sk.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(200);
      expect(uploadFile).toHaveBeenCalled();
      // pastikan fileSk ada di pendingChanges yang di-set
      const setArgs = setSpy.mock.calls[0][0];
      expect(setArgs.pendingChanges.fileSk).toBe("https://azure/file-baru.pdf");
      expect(setArgs.pendingChanges.diajukanOleh).toBe(2);
      expect(setArgs.statusVerifikasi).toBe("pending");
    });

    it("admin_pusat update dengan file → file lama dihapus & file baru di-upload", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue({
        ...mockPenangkaran,
        fileSk: "https://azure/file-lama.pdf",
      });
      (uploadFile as jest.Mock).mockResolvedValue("https://azure/file-baru.pdf");
      (deleteFile as jest.Mock).mockResolvedValue(undefined);
      (mockDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockPenangkaran]),
          }),
        }),
      });

      const res = await request(app)
        .put("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .field("namaPenangkaran", "Penangkaran Test")
        .attach("fileSk", Buffer.from("dummy pdf"), {
          filename: "sk.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(200);
      expect(deleteFile).toHaveBeenCalledWith("https://azure/file-lama.pdf");
      expect(uploadFile).toHaveBeenCalled();
    });

    it("gagal saat server error di PUT", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      const res = await request(app)
        .put("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send(mockBodyPenangkaran);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
  describe("DELETE /api/penangkaran/:id", () => {
    it("berhasil hapus data sebagai admin pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue(
        mockPenangkaran
      );
      (mockDb.delete as jest.Mock).mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const res = await request(app)
        .delete("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("gagal hapus jika data tidak ditemukan", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/penangkaran/999")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("bidang_wilayah hapus data milik orang lain → soft delete (pending)", async () => {
      // Aturan baru: bidang_wilayah ajukan penghapusan, tidak hard delete.
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue(
        mockPenangkaran
      );
      (mockDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockPenangkaran]),
          }),
        }),
      });

      const res = await request(app)
        .delete("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockBidangToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Pengajuan penghapusan");
    });

    it("gagal hapus sebagai seksi wilayah", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockSeksiUser);

      const res = await request(app)
        .delete("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockSeksiToken}`);

      expect(res.status).toBe(403);
    });

    it("bidang_wilayah hapus data milik sendiri → tetap soft delete (pending)", async () => {
      // Aturan baru: bidang_wilayah selalu masuk alur pendingChanges,
      // tidak peduli pemilik atau bukan.
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue({
        ...mockPenangkaran,
        createdBy: 2,
      });
      (mockDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([
              { ...mockPenangkaran, createdBy: 2 },
            ]),
          }),
        }),
      });

      const res = await request(app)
        .delete("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockBidangToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Pengajuan penghapusan");
    });

    it("gagal hapus tanpa token", async () => {
      const res = await request(app).delete("/api/penangkaran/1");

      expect(res.status).toBe(401);
    });

    it("gagal saat server error di DELETE", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      const res = await request(app)
        .delete("/api/penangkaran/1")
        .set("Authorization", `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/penangkaran/bulk", () => {
    it("berhasil bulk delete sebagai admin", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      // bulkDeleteHandler memanggil findById untuk setiap id (existence check)
      (mockDb.query.penangkaran.findFirst as jest.Mock).mockResolvedValue(
        mockPenangkaran
      );
      (mockDb.delete as jest.Mock).mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      });

      const res = await request(app)
        .delete("/api/penangkaran/bulk")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({ ids: [1, 2, 3] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("gagal bulk delete tanpa ids", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .delete("/api/penangkaran/bulk")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("gagal bulk delete dengan ids bukan array", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .delete("/api/penangkaran/bulk")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({ ids: "not-array" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("gagal bulk delete dengan array kosong", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .delete("/api/penangkaran/bulk")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({ ids: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("gagal bulk delete dengan id tidak valid", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .delete("/api/penangkaran/bulk")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({ ids: [1, "invalid", 3] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("bidang_wilayah bulk delete data manapun → semua jadi pending (soft delete)", async () => {
      // Aturan baru: bidang_wilayah boleh ajukan penghapusan untuk data manapun.
      // Backend mengubah status menjadi pending alih-alih hard delete.
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);
      (mockDb.query.penangkaran.findFirst as jest.Mock)
        .mockResolvedValueOnce({ ...mockPenangkaran, createdBy: 2 })
        .mockResolvedValueOnce({ ...mockPenangkaran, createdBy: 1 });
      (mockDb.update as jest.Mock).mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      });

      const res = await request(app)
        .delete("/api/penangkaran/bulk")
        .set("Authorization", `Bearer ${mockBidangToken}`)
        .send({ ids: [1, 2] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("pengajuan penghapusan");
    });

    it("gagal saat server error di bulk delete", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.delete as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .delete("/api/penangkaran/bulk")
        .set("Authorization", `Bearer ${mockAdminToken}`)
        .send({ ids: [1, 2] });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});