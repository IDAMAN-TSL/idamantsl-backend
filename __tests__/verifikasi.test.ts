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

const mockAdminUser = { id: 1, email: "admin@bbksda-jabar.id", role: "admin_pusat", wilayahId: null };
const mockBidangUser = { id: 2, email: "budi@bbksda-jabar.id", role: "bidang_wilayah", wilayahId: 1 };

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockReferensiPending = {
  id: 1,
  namaDaerah: "Harimau Jawa",
  jenis: "satwa_liar",
  statusVerifikasi: "pending",
  pendingChanges: null,       // null → jenisPengajuan = "tambah"
  createdBy: 2,
  updatedAt: new Date(),
};

const mockReferensiPendingPerbarui = {
  ...mockReferensiPending,
  pendingChanges: { namaDaerah: "Harimau Jawa Baru" }, // ada key → jenisPengajuan = "perbarui"
};

const mockReferensiPendingHapus = {
  ...mockReferensiPending,
  pendingChanges: { _action: "delete" },               // _action delete → jenisPengajuan = "hapus"
};

const mockReferensiPendingNoCreatedBy = {
  ...mockReferensiPending,
  createdBy: null,             // null → getNamaInputor tidak dipanggil
};

const mockPenangkaranPending = {
  id: 1,
  namaPenangkaran: "Penangkaran Rusa Timor",
  statusVerifikasi: "pending",
  pendingChanges: null,
  createdBy: 2,
  updatedAt: new Date(),
};

const mockAllUsers = [
  { id: 1, nama: "Admin BBKSDA Jabar" },
  { id: 2, nama: "Budi Santoso" },
];

// ─── Mock chain helpers ───────────────────────────────────────────────────────

/** select().from().where().limit() → untuk find() di TABLE_REGISTRY */
const mockSelectLimitChain = (returnValue: unknown[]) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue(returnValue),
    }),
  }),
});

/** select({...}).from().where() → untuk getDataPending / getDataApproved */
const mockSelectWhereChain = (returnValue: unknown[]) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue(returnValue),
  }),
});

/** select({...}).from() → untuk ambil semua users (userMap) */
const mockSelectFromChain = (returnValue: unknown[]) => ({
  from: jest.fn().mockResolvedValue(returnValue),
});

/** select().from().orderBy() → untuk getVerifikasiLog */
const mockSelectOrderByChain = (returnValue: unknown[]) => ({
  from: jest.fn().mockReturnValue({
    orderBy: jest.fn().mockResolvedValue(returnValue),
  }),
});

/** select().from().where().limit() single-use untuk getNamaInputor */
const mockSelectNamaInputorChain = (returnValue: unknown[]) => ({
  from: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue(returnValue),
    }),
  }),
});

const mockUpdateChain = () => ({
  set: jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue(undefined),
  }),
});

const mockInsertChain = () => ({
  values: jest.fn().mockResolvedValue(undefined),
});

const mockDeleteChain = () => ({
  where: jest.fn().mockResolvedValue(undefined),
});

// ─── Helper: setup getDataPending mock (6 db.select calls) ───────────────────
// Urutan pemanggilan db.select di getDataPending:
//   [0] referensiTsl.where("pending")              → mockSelectWhereChain
//   [1] penangkaran.where("pending")               → mockSelectWhereChain
//   [2] pengedaranDalamNegeri.where("pending")     → mockSelectWhereChain
//   [3] pengedaranLuarNegeri.where("pending")      → mockSelectWhereChain
//   [4] lembagaKonservasi.where("pending")         → mockSelectWhereChain
//   [5] users (userMap)                            → mockSelectFromChain

function setupPendingMock(
  referensiList: unknown[],
  penangkaranList: unknown[],
  userList = mockAllUsers
) {
  (mockDb.select as jest.Mock)
    .mockReturnValueOnce(mockSelectWhereChain(referensiList))
    .mockReturnValueOnce(mockSelectWhereChain(penangkaranList))
    .mockReturnValueOnce(mockSelectWhereChain([]))  // pengedaran dn
    .mockReturnValueOnce(mockSelectWhereChain([]))  // pengedaran ln
    .mockReturnValueOnce(mockSelectWhereChain([]))  // lembaga konservasi
    .mockReturnValueOnce(mockSelectFromChain(userList));
}

// ─── Helper: setup getDataApproved mock (5 db.select calls) ──────────────────
// Urutan:
//   [0] referensiTsl.where("disetujui")            → mockSelectWhereChain
//   [1] penangkaran.where("disetujui")             → mockSelectWhereChain
//   [2] pengedaranDalamNegeri.where("disetujui")   → mockSelectWhereChain
//   [3] pengedaranLuarNegeri.where("disetujui")    → mockSelectWhereChain
//   [4] lembagaKonservasi.where("disetujui")       → mockSelectWhereChain

function setupApprovedMock(referensiList: unknown[], penangkaranList: unknown[]) {
  (mockDb.select as jest.Mock)
    .mockReturnValueOnce(mockSelectWhereChain(referensiList))
    .mockReturnValueOnce(mockSelectWhereChain(penangkaranList))
    .mockReturnValueOnce(mockSelectWhereChain([]))  // pengedaran dn
    .mockReturnValueOnce(mockSelectWhereChain([]))  // pengedaran ln
    .mockReturnValueOnce(mockSelectWhereChain([])); // lembaga konservasi
}

// ─── Helper: setup approveData / tolakData mock ───────────────────────────────
// find() di TABLE_REGISTRY memanggil: select().from().where().limit()

function setupActionMock(record: unknown) {
  (mockDb.select as jest.Mock).mockReturnValue(mockSelectLimitChain(record ? [record] : []));
}

describe("Verifikasi Endpoints", () => {
  beforeEach(() => jest.resetAllMocks()); // resetAllMocks: clear calls DAN restore implementasi, mencegah mockImplementation throw dari test 500 bocor ke test berikutnya

  // =============================================
  // GET /api/verifikasi/pending
  // =============================================

  describe("GET /api/verifikasi/pending", () => {

    it("200 - berhasil ambil data pending, jenisPengajuan = tambah (pendingChanges null)", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      // pendingChanges null → getJenisPengajuan → "tambah"
      setupPendingMock([mockReferensiPending], [mockPenangkaranPending]);

      const res = await request(app)
        .get("/api/verifikasi/pending")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("referensi_tsl");
      expect(res.body.data).toHaveProperty("penangkaran");
      expect(res.body.data.referensi_tsl[0].jenisPengajuan).toBe("tambah");
      expect(res.body.total).toBe(2);
    });

    it("200 - jenisPengajuan = perbarui (pendingChanges punya key selain _action)", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      // pendingChanges ada key → getJenisPengajuan → "perbarui"
      setupPendingMock([mockReferensiPendingPerbarui], []);

      const res = await request(app)
        .get("/api/verifikasi/pending")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.data.referensi_tsl[0].jenisPengajuan).toBe("perbarui");
    });

    it("200 - jenisPengajuan = hapus (pendingChanges._action === 'delete')", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      // pendingChanges._action = delete → getJenisPengajuan → "hapus"
      setupPendingMock([mockReferensiPendingHapus], []);

      const res = await request(app)
        .get("/api/verifikasi/pending")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.data.referensi_tsl[0].jenisPengajuan).toBe("hapus");
    });

    it("200 - createdBy null → namaInputor null (tidak lookup ke userMap)", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      // createdBy null → r.createdBy ? (...) : null → namaInputor = null
      setupPendingMock([mockReferensiPendingNoCreatedBy], []);

      const res = await request(app)
        .get("/api/verifikasi/pending")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.data.referensi_tsl[0].namaInputor).toBeNull();
    });

    it("200 - data pending kosong di semua tabel", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupPendingMock([], []);

      const res = await request(app)
        .get("/api/verifikasi/pending")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });

    it("500 - error server saat query gagal", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

      const res = await request(app)
        .get("/api/verifikasi/pending")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal mengambil data pending");
    });

    it("401 - tanpa token", async () => {
      const res = await request(app).get("/api/verifikasi/pending");
      expect(res.status).toBe(401);
    });

    it("403 - bukan admin_pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);

      const res = await request(app)
        .get("/api/verifikasi/pending")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(403);
    });
  });

  // =============================================
  // GET /api/verifikasi/approved
  // =============================================

  describe("GET /api/verifikasi/approved", () => {

    it("200 - berhasil ambil data approved dari semua tabel", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupApprovedMock(
        [{ ...mockReferensiPending, statusVerifikasi: "disetujui" }],
        [{ ...mockPenangkaranPending, statusVerifikasi: "disetujui" }]
      );

      const res = await request(app)
        .get("/api/verifikasi/approved")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("referensi_tsl");
      expect(res.body.data).toHaveProperty("penangkaran");
      expect(res.body.total).toBe(2);
    });

    it("200 - data approved kosong", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupApprovedMock([], []);

      const res = await request(app)
        .get("/api/verifikasi/approved")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });

    it("500 - error server saat query gagal", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

      const res = await request(app)
        .get("/api/verifikasi/approved")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal mengambil data approved");
    });

    it("401 - tanpa token", async () => {
      const res = await request(app).get("/api/verifikasi/approved");
      expect(res.status).toBe(401);
    });

    it("200 - semua role yang login bisa akses approved (tidak ada guard authorize)", async () => {
      // Route /approved hanya dilindungi authenticate, tidak ada authorize("admin_pusat")
      // sehingga bidang_wilayah pun bisa akses dan dapat data
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);
      setupApprovedMock([], []);

      const res = await request(app)
        .get("/api/verifikasi/approved")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
    });

  });

  // =============================================
  // POST /api/verifikasi/approve
  // =============================================

  describe("POST /api/verifikasi/approve", () => {

    it("200 - approve data baru (pendingChanges null → jenisPengajuan tambah)", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock(mockReferensiPending); // pendingChanges: null
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Data berhasil disetujui");
    });

    it("200 - approve perubahan data (pendingChanges ada key → jenisPengajuan perbarui)", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock(mockReferensiPendingPerbarui); // pendingChanges: { namaDaerah: "..." }
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1, catatan: "Sudah sesuai" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Data berhasil disetujui");
    });

    it("200 - approve pengajuan penghapusan (pendingChanges._action = delete)", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock(mockReferensiPendingHapus); // pendingChanges: { _action: "delete" }
      (mockDb.delete as jest.Mock).mockReturnValue(mockDeleteChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Pengajuan penghapusan disetujui, data telah dihapus");
    });

    it("200 - approve penghapusan dengan createdBy null", async () => {
      // Menutup branch diajukanOleh = null pada insertVerifikasiLog
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock({ ...mockReferensiPendingHapus, createdBy: null });
      (mockDb.delete as jest.Mock).mockReturnValue(mockDeleteChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Pengajuan penghapusan disetujui, data telah dihapus");
    });

    it("200 - approve data penangkaran", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock(mockPenangkaranPending);
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "penangkaran", targetId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Data berhasil disetujui");
    });

    it("400 - tabelTarget dan targetId tidak diisi", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("tabelTarget dan targetId wajib diisi");
    });

    it("400 - hanya tabelTarget yang tidak diisi", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ targetId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("tabelTarget dan targetId wajib diisi");
    });

    it("400 - tabelTarget tidak valid", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "tabel_tidak_ada", targetId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("tabelTarget tidak valid");
    });

    it("404 - data tidak ditemukan", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock(null);

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 999 });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Data tidak ditemukan");
    });

    it("400 - data tidak dalam status pending", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock({ ...mockReferensiPending, statusVerifikasi: "disetujui" });

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("tidak dalam status pending");
    });

    it("500 - error server saat approve gagal", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1 });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal menyetujui data");
    });

    it("403 - bukan admin_pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1 });

      expect(res.status).toBe(403);
    });
  });

  // =============================================
  // POST /api/verifikasi/tolak
  // =============================================

  describe("POST /api/verifikasi/tolak", () => {

    it("200 - tolak data (pendingChanges null → jenisPengajuan tambah)", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock(mockReferensiPending); // pendingChanges null
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1, catatan: "Data tidak lengkap" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Data berhasil ditolak");
      expect(res.body.catatan).toBe("Data tidak lengkap");
    });

    it("200 - tolak perubahan data (pendingChanges ada key → jenisPengajuan perbarui)", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock(mockReferensiPendingPerbarui);
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1, catatan: "Nama tidak sesuai referensi" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Data berhasil ditolak");
    });

    it("200 - tolak pengajuan penghapusan (pendingChanges._action = delete)", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock(mockReferensiPendingHapus);
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1, catatan: "Data masih digunakan" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Data berhasil ditolak");
    });

    it("200 - tolak dengan createdBy null", async () => {
      // Menutup branch diajukanOleh = null pada insertVerifikasiLog
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock({ ...mockReferensiPending, createdBy: null });
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1, catatan: "Data tidak valid" });

      expect(res.status).toBe(200);
    });

    it("400 - catatan kosong string", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1, catatan: "" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Catatan wajib diisi saat menolak data");
    });

    it("400 - catatan hanya spasi (trim kosong)", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1, catatan: "   " });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Catatan wajib diisi saat menolak data");
    });

    it("400 - catatan tidak dikirim sama sekali", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Catatan wajib diisi saat menolak data");
    });

    it("400 - tabelTarget dan targetId tidak diisi", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ catatan: "Ada kesalahan" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("tabelTarget dan targetId wajib diisi");
    });

    it("404 - data tidak ditemukan", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock(null);

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "penangkaran", targetId: 999, catatan: "Data tidak valid" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Data tidak ditemukan");
    });

    it("400 - data tidak dalam status pending", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock({ ...mockReferensiPending, statusVerifikasi: "disetujui" });

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1, catatan: "Data tidak valid" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("tidak dalam status pending");
    });

    it("500 - error server saat tolak gagal", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1, catatan: "Data tidak valid" });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal menolak data");
    });

    it("403 - bukan admin_pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "referensi_tsl", targetId: 1, catatan: "Data tidak valid" });

      expect(res.status).toBe(403);
    });
  });

  // =============================================
  // GET /api/verifikasi/log
  // =============================================

  describe("GET /api/verifikasi/log", () => {

    it("200 - berhasil ambil log verifikasi", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockReturnValue(mockSelectOrderByChain([
        {
          id: 1,
          tabelTarget: "referensi_tsl",
          targetId: 1,
          jenisPengajuan: "perbarui",
          status: "disetujui",
          catatan: null,
          createdBy: 2,
          verifikasiOleh: 1,
          createdAt: new Date(),
        },
      ]));

      const res = await request(app)
        .get("/api/verifikasi/log")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("200 - log kosong", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockReturnValue(mockSelectOrderByChain([]));

      const res = await request(app)
        .get("/api/verifikasi/log")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("500 - error server saat query log gagal", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      (mockDb.select as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

      const res = await request(app)
        .get("/api/verifikasi/log")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal mengambil log verifikasi");
    });

    it("401 - tanpa token", async () => {
      const res = await request(app).get("/api/verifikasi/log");
      expect(res.status).toBe(401);
    });

    it("403 - bukan admin_pusat", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockBidangUser);

      const res = await request(app)
        .get("/api/verifikasi/log")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(403);
    });
  });

  // =============================================
  // Branch coverage tambahan
  // =============================================

  describe("Branch coverage: getDiajukanOleh dari pendingChanges.diajukanOleh", () => {
    it("200 - pending: diajukanOleh dari pendingChanges (bukan createdBy)", async () => {
      // Menutup branch: typeof diajukan === 'number' → return diajukan
      // bidang_wilayah (id:2) ngedit data milik admin (createdBy:1)
      // diajukanOleh: 2 → namaInputor = "Budi Santoso" bukan "Admin BBKSDA"
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupPendingMock([{
        ...mockReferensiPending,
        createdBy: 1,                                    // pemilik: admin
        pendingChanges: { namaDaerah: "Updated", diajukanOleh: 2 }, // pengaju: bidang
      }], []);

      const res = await request(app)
        .get("/api/verifikasi/pending")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      // namaInputor harus dari diajukanOleh (2 = "Budi Santoso"), bukan createdBy (1 = "Admin BBKSDA")
      expect(res.body.data.referensi_tsl[0].namaInputor).toBe("Budi Santoso");
    });

    it("200 - pending: data 3 tabel baru (dn, ln, lembaga) juga masuk response", async () => {
      // Menutup branch getDataPending yang include 3 tabel baru di response
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      // Override setupPendingMock untuk isi dn, ln, lembaga
      (mockDb.select as jest.Mock)
        .mockReturnValueOnce(mockSelectWhereChain([]))  // referensi
        .mockReturnValueOnce(mockSelectWhereChain([]))  // penangkaran
        .mockReturnValueOnce(mockSelectWhereChain([{ id: 10, namaPengedaran: "DN Test", statusVerifikasi: "pending", pendingChanges: null, createdBy: 2, updatedAt: new Date() }]))  // dn
        .mockReturnValueOnce(mockSelectWhereChain([]))  // ln
        .mockReturnValueOnce(mockSelectWhereChain([]))  // lembaga
        .mockReturnValueOnce(mockSelectFromChain(mockAllUsers));

      const res = await request(app)
        .get("/api/verifikasi/pending")
        .set("Authorization", "Bearer mocked_token");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("pengedaran_dalam_negeri");
      expect(res.body.data).toHaveProperty("pengedaran_luar_negeri");
      expect(res.body.data).toHaveProperty("lembaga_konservasi");
      expect(res.body.data.pengedaran_dalam_negeri).toHaveLength(1);
    });
  });

  describe("Branch coverage: approve & tolak tabel baru", () => {
    it("200 - approve data pengedaran_dalam_negeri", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock({ ...mockPenangkaranPending, statusVerifikasi: "pending" });
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "pengedaran_dalam_negeri", targetId: 1 });

      expect(res.status).toBe(200);
    });

    it("200 - approve data pengedaran_luar_negeri", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock({ ...mockPenangkaranPending, statusVerifikasi: "pending" });
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "pengedaran_luar_negeri", targetId: 1 });

      expect(res.status).toBe(200);
    });

    it("200 - approve data lembaga_konservasi", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock({ ...mockPenangkaranPending, statusVerifikasi: "pending" });
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/approve")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "lembaga_konservasi", targetId: 1 });

      expect(res.status).toBe(200);
    });

    it("200 - tolak data pengedaran_dalam_negeri", async () => {
      (jwt.verify as jest.Mock).mockReturnValue(mockAdminUser);
      setupActionMock({ ...mockPenangkaranPending, statusVerifikasi: "pending" });
      (mockDb.update as jest.Mock).mockReturnValue(mockUpdateChain());
      (mockDb.insert as jest.Mock).mockReturnValue(mockInsertChain());

      const res = await request(app)
        .post("/api/verifikasi/tolak")
        .set("Authorization", "Bearer mocked_token")
        .send({ tabelTarget: "pengedaran_dalam_negeri", targetId: 1, catatan: "Tidak lengkap" });

      expect(res.status).toBe(200);
    });
  });
});