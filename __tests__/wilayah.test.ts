import request from "supertest";
import app from "../index";
import { db } from "../db/index";
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

const mockAdminToken = "Bearer mock-admin-token";

const mockAdmin = {
  id: 1,
  email: "admin@bbksda-jabar.id",
  role: "admin_pusat",
};

const mockWilayahBidang = [
  { id: 1, namaWilayah: "BBKSDA Jawa Barat I", tipeWilayah: "bidang", nomorWilayah: 1 },
  { id: 2, namaWilayah: "BBKSDA Jawa Barat II", tipeWilayah: "bidang", nomorWilayah: 2 },
  { id: 3, namaWilayah: "BBKSDA Jawa Barat III", tipeWilayah: "bidang", nomorWilayah: 3 },
];

const mockWilayahSeksi = [
  { id: 4, namaWilayah: "Seksi Wilayah I", tipeWilayah: "seksi", nomorWilayah: 1 },
  { id: 5, namaWilayah: "Seksi Wilayah II", tipeWilayah: "seksi", nomorWilayah: 2 },
];

const mockSeksiMapping = [
  { id: 4, namaWilayah: "Serang", tipeWilayah: "seksi", nomorWilayah: "I" },
  { id: 5, namaWilayah: "Bogor", tipeWilayah: "seksi", nomorWilayah: "II" },
  { id: 6, namaWilayah: "Soreang", tipeWilayah: "seksi", nomorWilayah: "III" },
  { id: 7, namaWilayah: "Purwakarta", tipeWilayah: "seksi", nomorWilayah: "IV" },
];

const mockAllWilayah = [...mockWilayahBidang, ...mockWilayahSeksi];

function mockJwtVerify() {
  (jwt.verify as jest.Mock).mockReturnValue(mockAdmin);
}

function mockSelect(returnValue: unknown) {
  const chain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(returnValue),
  };
  (db.select as jest.Mock).mockReturnValue(chain);
  return chain;
}

function mockSelectBidangThenSeksi(bidangReturn: unknown[], seksiReturn: unknown[]) {
  const bidangChain = {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(bidangReturn),
      }),
    }),
  };
  const seksiChain = {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue(seksiReturn),
      }),
    }),
  };
  (db.select as jest.Mock)
    .mockReturnValueOnce(bidangChain)
    .mockReturnValueOnce(seksiChain);
}

describe("Wilayah Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJwtVerify();
  });

  // ─── GET /api/wilayah ─────────────────────────────────────────────────────

  describe("GET /api/wilayah", () => {
    it("200 - berhasil mengambil semua wilayah (bidang + seksi)", async () => {
      mockSelect(mockAllWilayah);

      const res = await request(app)
        .get("/api/wilayah")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(mockAllWilayah.length);
    });

    it("200 - list kosong jika tidak ada wilayah", async () => {
      mockSelect([]);

      const res = await request(app)
        .get("/api/wilayah")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("500 - error server saat query gagal", async () => {
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .get("/api/wilayah")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal mengambil data wilayah");
    });
  });

  // ─── GET /api/wilayah/bidang ──────────────────────────────────────────────

  describe("GET /api/wilayah/bidang", () => {
    it("200 - berhasil mengambil wilayah bertipe bidang", async () => {
      mockSelect(mockWilayahBidang);

      const res = await request(app)
        .get("/api/wilayah/bidang")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(mockWilayahBidang.length);
      expect(res.body.data.every((w: { tipeWilayah: string }) => w.tipeWilayah === "bidang")).toBe(true);
    });

    it("200 - list kosong jika tidak ada wilayah bidang", async () => {
      mockSelect([]);

      const res = await request(app)
        .get("/api/wilayah/bidang")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("500 - error server saat query wilayah bidang gagal", async () => {
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .get("/api/wilayah/bidang")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal mengambil data wilayah bidang");
    });
  });

  // ─── GET /api/wilayah/seksi ───────────────────────────────────────────────

  describe("GET /api/wilayah/seksi", () => {
    it("200 - berhasil mengambil wilayah bertipe seksi", async () => {
      mockSelect(mockWilayahSeksi);

      const res = await request(app)
        .get("/api/wilayah/seksi")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(mockWilayahSeksi.length);
      expect(res.body.data.every((w: { tipeWilayah: string }) => w.tipeWilayah === "seksi")).toBe(true);
    });

    it("200 - list kosong jika tidak ada wilayah seksi", async () => {
      mockSelect([]);

      const res = await request(app)
        .get("/api/wilayah/seksi")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("500 - error server saat query wilayah seksi gagal", async () => {
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .get("/api/wilayah/seksi")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal mengambil data wilayah seksi");
    });

    it("200 - filter seksi berdasarkan nama bidang Bogor", async () => {
      mockSelect(mockSeksiMapping);

      const res = await request(app)
        .get("/api/wilayah/seksi?bidang=bogor")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.map((item: { namaWilayah: string }) => item.namaWilayah)).toEqual(["Serang", "Bogor"]);
    });

    it("200 - filter seksi berdasarkan bidangWilayahId", async () => {
      mockSelectBidangThenSeksi(
        [{ id: 2, namaWilayah: "Soreang", tipeWilayah: "bidang" }],
        mockSeksiMapping
      );

      const res = await request(app)
        .get("/api/wilayah/seksi?bidangWilayahId=2")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(200);
      expect(res.body.data.map((item: { namaWilayah: string }) => item.namaWilayah)).toEqual(["Soreang", "Purwakarta"]);
    });

    it("404 - bidangWilayahId tidak ditemukan", async () => {
      mockSelectBidangThenSeksi([], mockSeksiMapping);

      const res = await request(app)
        .get("/api/wilayah/seksi?bidangWilayahId=999")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Bidang wilayah tidak ditemukan");
    });

    it("400 - nama bidang tidak valid", async () => {
      mockSelect(mockSeksiMapping);

      const res = await request(app)
        .get("/api/wilayah/seksi?bidang=tidak-valid")
        .set("Authorization", mockAdminToken);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Bidang wilayah tidak valid");
    });
  });
});
