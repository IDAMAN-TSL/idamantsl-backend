/**
 * pengedaran-dn.test.ts
 *
 * Test untuk pengedaran-dn (dipakai oleh module.factory.ts).
 * Karena pengedaran-ln & lembaga-konservasi identik, satu file test ini
 * sudah menutup coverage module.factory.ts secara keseluruhan.
 */

import request from "supertest";
import app from "../index";
import { db } from "../db/index";

jest.mock("../db/index", () => ({
    db: {
        query: {
            pengedaranDalamNegeri: {
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
        constructor() { super("jwt expired"); this.name = "TokenExpiredError"; }
    },
    JsonWebTokenError: class JsonWebTokenError extends Error {
        constructor() { super("invalid token"); this.name = "JsonWebTokenError"; }
    },
}));

jest.mock("../src/helpers/azure-storage", () => ({
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
}));

import { uploadFile, deleteFile } from "../src/helpers/azure-storage";
import jwt from "jsonwebtoken";
const mockDb = db as jest.Mocked<typeof db>;

const ADMIN = { id: 1, email: "admin@bbksda-jabar.id", role: "admin_pusat", wilayahId: null };
const BIDANG = { id: 2, email: "bidang@bbksda-jabar.id", role: "bidang_wilayah", wilayahId: 1 };
const SEKSI = { id: 3, email: "seksi@bbksda-jabar.id", role: "seksi_wilayah", wilayahId: 4 };

const TOKEN = "Bearer mocked_token";

const mockData = {
    id: 1,
    namaPengedaran: "Pengedaran DN Rusa Timor",
    nomor: "DN-001/2026",
    statusVerifikasi: "disetujui",
    pendingChanges: null,
    createdBy: 1,
    fileSk: null,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockBody = {
    namaPengedaran: "Pengedaran DN Test",
    bidangWilayahId: 1,
    jantan: 2,
    betina: 2,
};

describe("Pengedaran Dalam Negeri Endpoints (via module.factory)", () => {
    beforeEach(() => jest.clearAllMocks());

    // ── GET /api/pengedaran-dn ───────────────────────────────────────────────

    describe("GET /api/pengedaran-dn", () => {
        it("200 - berhasil ambil semua data (default: disetujui)", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findMany as jest.Mock).mockResolvedValue([mockData]);

            const res = await request(app).get("/api/pengedaran-dn").set("Authorization", TOKEN);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.total).toBe(1);
        });

        it("200 - filter status=all mengembalikan semua data", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findMany as jest.Mock).mockResolvedValue([mockData]);

            const res = await request(app).get("/api/pengedaran-dn?status=all").set("Authorization", TOKEN);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it("200 - filter status=pending", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findMany as jest.Mock).mockResolvedValue([]);

            const res = await request(app).get("/api/pengedaran-dn?status=pending").set("Authorization", TOKEN);

            expect(res.status).toBe(200);
        });

        it("400 - status tidak valid", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);

            const res = await request(app).get("/api/pengedaran-dn?status=invalid").set("Authorization", TOKEN);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("401 - tanpa token", async () => {
            const res = await request(app).get("/api/pengedaran-dn");
            expect(res.status).toBe(401);
        });

        it("500 - server error", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));

            const res = await request(app).get("/api/pengedaran-dn").set("Authorization", TOKEN);

            expect(res.status).toBe(500);
        });
    });

    // ── GET /api/pengedaran-dn/:id ───────────────────────────────────────────

    describe("GET /api/pengedaran-dn/:id", () => {
        it("200 - berhasil ambil data by ID", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue(mockData);

            const res = await request(app).get("/api/pengedaran-dn/1").set("Authorization", TOKEN);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(1);
        });

        it("400 - ID tidak valid (bukan angka)", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);

            const res = await request(app).get("/api/pengedaran-dn/abc").set("Authorization", TOKEN);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it("404 - data tidak ditemukan", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue(null);

            const res = await request(app).get("/api/pengedaran-dn/999").set("Authorization", TOKEN);

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
        });

        it("500 - server error", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockRejectedValue(new Error("DB error"));

            const res = await request(app).get("/api/pengedaran-dn/1").set("Authorization", TOKEN);

            expect(res.status).toBe(500);
        });
    });

    // ── POST /api/pengedaran-dn ──────────────────────────────────────────────

    describe("POST /api/pengedaran-dn", () => {
        it("201 - admin → langsung disetujui", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.insert as jest.Mock).mockReturnValue({
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([mockData]),
                }),
            });

            const res = await request(app).post("/api/pengedaran-dn").set("Authorization", TOKEN).send(mockBody);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain("berhasil ditambahkan");
        });

        it("201 - bidang_wilayah → status pending", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(BIDANG);
            (mockDb.insert as jest.Mock).mockReturnValue({
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([{ ...mockData, statusVerifikasi: "pending" }]),
                }),
            });

            const res = await request(app).post("/api/pengedaran-dn").set("Authorization", TOKEN).send(mockBody);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain("menunggu verifikasi Admin Pusat");
        });

        it("400 - nama pengedaran tidak diisi", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);

            const res = await request(app).post("/api/pengedaran-dn").set("Authorization", TOKEN).send({ bidangWilayahId: 1 });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("namaPengedaran wajib diisi");
        });

        it("201 - dengan upload file SK", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (uploadFile as jest.Mock).mockResolvedValue("https://azure/file.pdf");
            (mockDb.insert as jest.Mock).mockReturnValue({
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([{ ...mockData, fileSk: "https://azure/file.pdf" }]),
                }),
            });

            const res = await request(app)
                .post("/api/pengedaran-dn")
                .set("Authorization", TOKEN)
                .field("namaPengedaran", "Pengedaran DN Test")
                .attach("fileSk", Buffer.from("dummy"), { filename: "sk.pdf", contentType: "application/pdf" });

            expect(res.status).toBe(201);
            expect(uploadFile).toHaveBeenCalled();
        });

        it("403 - seksi_wilayah tidak bisa POST", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(SEKSI);

            const res = await request(app).post("/api/pengedaran-dn").set("Authorization", TOKEN).send(mockBody);

            expect(res.status).toBe(403);
        });

        it("401 - tanpa token", async () => {
            const res = await request(app).post("/api/pengedaran-dn").send(mockBody);
            expect(res.status).toBe(401);
        });

        it("500 - server error", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.insert as jest.Mock).mockImplementation(() => { throw new Error("DB error"); });

            const res = await request(app).post("/api/pengedaran-dn").set("Authorization", TOKEN).send(mockBody);

            expect(res.status).toBe(500);
        });
    });

    // ── PUT /api/pengedaran-dn/:id ───────────────────────────────────────────

    describe("PUT /api/pengedaran-dn/:id", () => {
        it("200 - admin → langsung update", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue(mockData);
            (mockDb.update as jest.Mock).mockReturnValue({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([{ ...mockData, namaPengedaran: "Updated" }]),
                    }),
                }),
            });

            const res = await request(app).put("/api/pengedaran-dn/1").set("Authorization", TOKEN)
                .send({ namaPengedaran: "Updated" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain("berhasil diubah");
        });

        it("200 - bidang_wilayah → masuk pendingChanges", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(BIDANG);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue(mockData);
            (mockDb.update as jest.Mock).mockReturnValue({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([{ ...mockData, statusVerifikasi: "pending" }]),
                    }),
                }),
            });

            const res = await request(app).put("/api/pengedaran-dn/1").set("Authorization", TOKEN)
                .send({ namaPengedaran: "Updated Bidang" });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain("menunggu persetujuan Admin Pusat");
        });

        it("200 - bidang_wilayah + file → fileSk masuk pendingChanges", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(BIDANG);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue(mockData);
            (uploadFile as jest.Mock).mockResolvedValue("https://azure/new.pdf");
            const setSpy = jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([{ ...mockData, statusVerifikasi: "pending" }]),
                }),
            });
            (mockDb.update as jest.Mock).mockReturnValue({ set: setSpy });

            const res = await request(app).put("/api/pengedaran-dn/1").set("Authorization", TOKEN)
                .field("namaPengedaran", "Test")
                .attach("fileSk", Buffer.from("dummy"), { filename: "sk.pdf", contentType: "application/pdf" });

            expect(res.status).toBe(200);
            expect(uploadFile).toHaveBeenCalled();
            const setArgs = setSpy.mock.calls[0][0];
            expect(setArgs.pendingChanges.fileSk).toBe("https://azure/new.pdf");
        });

        it("200 - admin + file lama → hapus lama, upload baru", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue({
                ...mockData, fileSk: "https://azure/old.pdf"
            });
            (uploadFile as jest.Mock).mockResolvedValue("https://azure/new.pdf");
            (deleteFile as jest.Mock).mockResolvedValue(undefined);
            (mockDb.update as jest.Mock).mockReturnValue({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([mockData]),
                    }),
                }),
            });

            const res = await request(app).put("/api/pengedaran-dn/1").set("Authorization", TOKEN)
                .field("namaPengedaran", "Test")
                .attach("fileSk", Buffer.from("dummy"), { filename: "sk.pdf", contentType: "application/pdf" });

            expect(res.status).toBe(200);
            expect(deleteFile).toHaveBeenCalledWith("https://azure/old.pdf");
        });

        it("200 - admin + file baru, tidak ada file lama (fileSk null) → skip deleteFile", async () => {
            // Menutup branch: if (existing.fileSk) await deleteFile(...)
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue({
                ...mockData, fileSk: null
            });
            (uploadFile as jest.Mock).mockResolvedValue("https://azure/new.pdf");
            (mockDb.update as jest.Mock).mockReturnValue({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([mockData]),
                    }),
                }),
            });

            const res = await request(app).put("/api/pengedaran-dn/1").set("Authorization", TOKEN)
                .field("namaPengedaran", "Test")
                .attach("fileSk", Buffer.from("dummy"), { filename: "sk.pdf", contentType: "application/pdf" });

            expect(res.status).toBe(200);
            expect(deleteFile).not.toHaveBeenCalled();
            expect(uploadFile).toHaveBeenCalled();
        });

        it("400 - ID tidak valid", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);

            const res = await request(app).put("/api/pengedaran-dn/abc").set("Authorization", TOKEN)
                .send({ namaPengedaran: "Test" });

            expect(res.status).toBe(400);
        });

        it("404 - data tidak ditemukan", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue(null);

            const res = await request(app).put("/api/pengedaran-dn/999").set("Authorization", TOKEN)
                .send({ namaPengedaran: "Test" });

            expect(res.status).toBe(404);
        });

        it("403 - seksi_wilayah tidak bisa PUT", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(SEKSI);

            const res = await request(app).put("/api/pengedaran-dn/1").set("Authorization", TOKEN)
                .send({ namaPengedaran: "Test" });

            expect(res.status).toBe(403);
        });

        it("500 - server error", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockRejectedValue(new Error("DB error"));

            const res = await request(app).put("/api/pengedaran-dn/1").set("Authorization", TOKEN)
                .send({ namaPengedaran: "Test" });

            expect(res.status).toBe(500);
        });
    });

    // ── DELETE /api/pengedaran-dn/:id ────────────────────────────────────────

    describe("DELETE /api/pengedaran-dn/:id", () => {
        it("200 - admin → hard delete", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue(mockData);
            (mockDb.delete as jest.Mock).mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });

            const res = await request(app).delete("/api/pengedaran-dn/1").set("Authorization", TOKEN);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain("berhasil dihapus");
        });

        it("200 - bidang_wilayah → soft delete (pending)", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(BIDANG);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue(mockData);
            (mockDb.update as jest.Mock).mockReturnValue({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([mockData]),
                    }),
                }),
            });

            const res = await request(app).delete("/api/pengedaran-dn/1").set("Authorization", TOKEN);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain("Pengajuan penghapusan");
        });

        it("400 - ID tidak valid", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);

            const res = await request(app).delete("/api/pengedaran-dn/abc").set("Authorization", TOKEN);

            expect(res.status).toBe(400);
        });

        it("404 - data tidak ditemukan", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue(null);

            const res = await request(app).delete("/api/pengedaran-dn/999").set("Authorization", TOKEN);

            expect(res.status).toBe(404);
        });

        it("403 - seksi_wilayah tidak bisa DELETE", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(SEKSI);

            const res = await request(app).delete("/api/pengedaran-dn/1").set("Authorization", TOKEN);

            expect(res.status).toBe(403);
        });

        it("500 - server error", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockRejectedValue(new Error("DB error"));

            const res = await request(app).delete("/api/pengedaran-dn/1").set("Authorization", TOKEN);

            expect(res.status).toBe(500);
        });
    });

    // ── DELETE /api/pengedaran-dn/bulk ───────────────────────────────────────

    describe("DELETE /api/pengedaran-dn/bulk", () => {
        it("200 - admin → hard delete", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockResolvedValue(mockData);
            (mockDb.delete as jest.Mock).mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });

            const res = await request(app).delete("/api/pengedaran-dn/bulk").set("Authorization", TOKEN)
                .send({ ids: [1, 2] });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it("200 - bidang_wilayah → semua jadi pending", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(BIDANG);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock)
                .mockResolvedValueOnce(mockData)
                .mockResolvedValueOnce(mockData);
            (mockDb.update as jest.Mock).mockReturnValue({
                set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) }),
            });

            const res = await request(app).delete("/api/pengedaran-dn/bulk").set("Authorization", TOKEN)
                .send({ ids: [1, 2] });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain("pengajuan penghapusan");
        });

        it("400 - ids kosong", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);

            const res = await request(app).delete("/api/pengedaran-dn/bulk").set("Authorization", TOKEN)
                .send({});

            expect(res.status).toBe(400);
        });

        it("400 - ids bukan array", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);

            const res = await request(app).delete("/api/pengedaran-dn/bulk").set("Authorization", TOKEN)
                .send({ ids: "not-array" });

            expect(res.status).toBe(400);
        });

        it("400 - ids array kosong", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);

            const res = await request(app).delete("/api/pengedaran-dn/bulk").set("Authorization", TOKEN)
                .send({ ids: [] });

            expect(res.status).toBe(400);
        });

        it("400 - ids mengandung nilai bukan angka", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);

            const res = await request(app).delete("/api/pengedaran-dn/bulk").set("Authorization", TOKEN)
                .send({ ids: [1, "invalid"] });

            expect(res.status).toBe(400);
        });

        it("404 - salah satu data tidak ada", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock)
                .mockResolvedValueOnce(mockData)
                .mockResolvedValueOnce(null);

            const res = await request(app).delete("/api/pengedaran-dn/bulk").set("Authorization", TOKEN)
                .send({ ids: [1, 999] });

            expect(res.status).toBe(404);
        });

        it("500 - server error", async () => {
            (jwt.verify as jest.Mock).mockReturnValue(ADMIN);
            (mockDb.query.pengedaranDalamNegeri.findFirst as jest.Mock).mockRejectedValue(new Error("DB error"));

            const res = await request(app).delete("/api/pengedaran-dn/bulk").set("Authorization", TOKEN)
                .send({ ids: [1] });

            expect(res.status).toBe(500);
        });
    });
});
