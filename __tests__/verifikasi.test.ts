import request from "supertest";
import app from "../index";
import { db } from "../db/index";

jest.mock("../db/index", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock jsonwebtoken
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

import jwt from "jsonwebtoken";
const mockDb = db as jest.Mocked<typeof db>;

// Mock users
const mockAdminUser = { id: 1, email: "admin@bbksda-jabar.id", role: "admin_pusat", wilayahId: null };
const mockBidangUser = { id: 2, email: "budi@bbksda-jabar.id", role: "bidang_wilayah", wilayahId: 1 };

// Mock data pending
const mockReferensiPending = {
  id: 1,
  namaDaerah: "Harimau Jawa",
  jenis: "satwa_liar",
  statusVerifikasi: "pending",
  pendingChanges: null,
  createdBy: 2,
  updatedAt: new Date(),
};

const mockPenangkaranPending = {
  id: 1,
  namaPenangkaran: "Penangkaran Rusa Timor",
  statusVerifikasi: "pending",
  createdBy: 2,
  updatedAt: new Date(),
};

// Helper setup mock select chain
const mockSelectChain = (returnValue: unknown[]) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue(returnValue),
    }),
  }),
});

const mockSelectManyChain = (returnValue: unknown[]) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue(returnValue),
  }),
});

// Helper setup mock update chain
const mockUpdateChain = () => ({
  set: jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue(undefined),
  }),
});

// Helper setup mock insert chain
const mockInsertChain = () => ({
  values: jest.fn().mockResolvedValue(undefined),
});

// Helper setup mock delete chain
const mockDeleteChain = () => ({
  where: jest.fn().mockResolvedValue(undefined),
});

describe("Verifikasi Endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =============================================
  // GET DATA PENDING
  // =============================================

  describe("GET /api/verifikasi/pending", () => {
    it("berhasil ambil data pending sebagai admin pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      (mockDb.select as jest.Mock)
        .mockReturnValueOnce(mockSelectManyChain([mockReferensiPending]))
        .mockReturnValueOnce(mockSelectManyChain([mockPenangkaranPending]))
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue([
            { id: 1, nama: "Admin BBKSDA Jabar" },
            { id: 2, nama: "Budi Santoso" },
          ]),
        });

      const res = await request(app)
        .get("/api/verifikasi/pending")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("referensi_tsl");
      expect(res.body.data).toHaveProperty("penangkaran");
    });

    it("gagal tanpa token", async () => {
      const res = await request(app).get("/api/verifikasi/pending");
      expect(res.status).toBe(401);
    });

    it("gagal jika bukan admin pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);

      const res = await request(app)
        .get("/api/verifikasi/pending")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(403);
    });
  });

  // =============================================
  // APPROVE DATA
  // =============================================

  describe("POST /api/verifikasi/approve", () => {
    it("berhasil approve data referensi_tsl", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockReturnValue(
        mockSelectChain([{ ...mockReferensiPending, statusVerifikasi: "pending" }])
      );
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Data berhasil disetujui");
    });

    it("berhasil approve pengajuan penghapusan", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockReturnValue(
        mockSelectChain([{
          ...mockReferensiPending,
          statusVerifikasi: "pending",
          pendingChanges: { _action: "delete" },
        }])
      );
      (mockDb.delete as jest.Mock).mockReturnValue(mockDeleteChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Pengajuan penghapusan disetujui, data telah dihapus");
    });

    it("berhasil approve data penangkaran", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockReturnValue(
        mockSelectChain([{ ...mockPenangkaranPending, statusVerifikasi: "pending" }])
      );
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "penangkaran", targetId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Data berhasil disetujui");
    });

    it("gagal jika tabelTarget dan targetId tidak diisi", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("tabelTarget dan targetId wajib diisi");
    });

    it("gagal jika tabelTarget tidak valid", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "tabel_tidak_ada", targetId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("tabelTarget tidak valid");
    });

    it("gagal jika data tidak ditemukan", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockReturnValue(mockSelectChain([]));

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 999 });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Data tidak ditemukan");
    });

    it("gagal jika data tidak dalam status pending", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockReturnValue(
        mockSelectChain([{ ...mockReferensiPending, statusVerifikasi: "disetujui" }])
      );

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("tidak dalam status pending");
    });

    it("gagal jika bukan admin pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1 });

      expect(res.status).toBe(403);
    });
  });

  // =============================================
  // TOLAK DATA
  // =============================================

  describe("POST /api/verifikasi/tolak", () => {
    it("berhasil tolak data dengan catatan", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockReturnValue(
        mockSelectChain([{ ...mockReferensiPending, statusVerifikasi: "pending" }])
      );
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({
          tabelTarget: "referensi_tsl",
          targetId: 1,
          catatan: "Data tidak lengkap",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Data berhasil ditolak");
      expect(res.body.catatan).toBe("Data tidak lengkap");
    });

    it("gagal tolak jika catatan kosong", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({
          tabelTarget: "referensi_tsl",
          targetId: 1,
          catatan: "",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Catatan wajib diisi saat menolak data");
    });

    it("gagal tolak jika tabelTarget dan targetId tidak diisi", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ catatan: "Ada kesalahan" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("tabelTarget dan targetId wajib diisi");
    });

    it("gagal tolak jika data tidak ditemukan", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockReturnValue(mockSelectChain([]));

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({
          tabelTarget: "penangkaran",
          targetId: 999,
          catatan: "Data tidak valid",
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Data tidak ditemukan");
    });

    it("gagal tolak jika data tidak dalam status pending", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockReturnValue(
        mockSelectChain([{ ...mockReferensiPending, statusVerifikasi: "disetujui" }])
      );

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({
          tabelTarget: "referensi_tsl",
          targetId: 1,
          catatan: "Data tidak valid",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("tidak dalam status pending");
    });

    it("gagal jika bukan admin pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({
          tabelTarget: "referensi_tsl",
          targetId: 1,
          catatan: "Data tidak valid",
        });

      expect(res.status).toBe(403);
    });
  });

  // =============================================
  // GET VERIFIKASI LOG
  // =============================================

  describe("GET /api/verifikasi/log", () => {
    it("berhasil ambil log verifikasi sebagai admin", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue([
            {
              id: 1,
              tabelTarget: "referensi_tsl",
              targetId: 1,
              status: "disetujui",
              catatan: null,
              verifikasiOleh: 1,
              createdAt: new Date(),
            },
          ]),
        }),
      });

      const res = await request(app)
        .get("/api/verifikasi/log")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("gagal tanpa token", async () => {
      const res = await request(app).get("/api/verifikasi/log");
      expect(res.status).toBe(401);
    });

    it("gagal jika bukan admin pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);

      const res = await request(app)
        .get("/api/verifikasi/log")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(403);
    });
  });
});