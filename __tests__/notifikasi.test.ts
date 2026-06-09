import request from "supertest";
import app from "../index";
import { db } from "../db";
import jwt from "jsonwebtoken";

jest.mock("../db", () => ({
  db: {
    query: {
      notifikasi: {
        findMany: jest.fn(),
      },
    },
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
  sign: jest.fn(),
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

const mockUser = {
  id: 2,
  email: "bidang@bbksda.id",
  role: "bidang_wilayah",
  wilayahId: 1,
};

const TOKEN = "Bearer mock-token";

const expiringRecord = {
  id: 11,
  nomorSk: "SK.001/BBKSDA/2026",
  akhirMasaBerlaku: new Date("2026-12-31"),
};

const mockNotification = {
  id: 1,
  userId: 2,
  status: "unread",
  tabelTarget: "penangkaran",
  targetId: 11,
  nomorSk: "SK.001/BBKSDA/2026",
  tanggalKadaluarsa: new Date("2026-12-31"),
  judul: "SK Penangkaran akan kadaluarsa",
  pesan: "Nomor SK SK.001/BBKSDA/2026 akan kadaluarsa pada 2026-12-31",
};

function setUser() {
  (jwt.verify as jest.Mock).mockReturnValue(mockUser);
}

function selectWhereChain(returnValue: unknown[]) {
  return {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue(returnValue),
    }),
  };
}

function insertChain() {
  return {
    values: jest.fn().mockReturnValue({
      onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
    }),
  };
}

function updateReturningChain(returnValue: unknown[]) {
  return {
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(returnValue),
      }),
    }),
  };
}

function mockSyncAndUnreadCount() {
  (db.select as jest.Mock)
    .mockReturnValueOnce(selectWhereChain([expiringRecord]))
    .mockReturnValueOnce(selectWhereChain([]))
    .mockReturnValueOnce(selectWhereChain([]))
    .mockReturnValueOnce(selectWhereChain([]))
    .mockReturnValueOnce(selectWhereChain([{ count: 1 }]));

  (db.insert as jest.Mock).mockReturnValue(insertChain());
}

describe("Notifikasi Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUser();
  });

  describe("GET /api/notifikasi", () => {
    it("200 - sync SK kadaluarsa dan ambil notifikasi user", async () => {
      mockSyncAndUnreadCount();
      (db.query.notifikasi.findMany as jest.Mock).mockResolvedValue([mockNotification]);

      const res = await request(app)
        .get("/api/notifikasi")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.unreadCount).toBe(1);
      expect(db.insert).toHaveBeenCalledTimes(1);
    });

    it("200 - bisa filter status unread", async () => {
      mockSyncAndUnreadCount();
      (db.query.notifikasi.findMany as jest.Mock).mockResolvedValue([mockNotification]);

      const res = await request(app)
        .get("/api/notifikasi?status=unread")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("400 - status query tidak valid", async () => {
      const res = await request(app)
        .get("/api/notifikasi?status=invalid")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Status notifikasi tidak valid");
      expect(db.select).not.toHaveBeenCalled();
    });

    it("500 - error saat sync notifikasi", async () => {
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .get("/api/notifikasi")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal mengambil data notifikasi");
    });
  });

  describe("PUT /api/notifikasi/:id/read", () => {
    it("200 - tandai notifikasi read", async () => {
      (db.update as jest.Mock).mockReturnValue(updateReturningChain([{ ...mockNotification, status: "read" }]));

      const res = await request(app)
        .put("/api/notifikasi/1/read")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("read");
    });

    it("400 - ID read tidak valid", async () => {
      const res = await request(app)
        .put("/api/notifikasi/abc/read")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("ID tidak valid");
    });

    it("404 - notifikasi read tidak ditemukan", async () => {
      (db.update as jest.Mock).mockReturnValue(updateReturningChain([]));

      const res = await request(app)
        .put("/api/notifikasi/999/read")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/notifikasi/:id/unread", () => {
    it("200 - tandai notifikasi unread", async () => {
      (db.update as jest.Mock).mockReturnValue(updateReturningChain([{ ...mockNotification, status: "unread" }]));

      const res = await request(app)
        .put("/api/notifikasi/1/unread")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("unread");
    });

    it("400 - ID unread tidak valid", async () => {
      const res = await request(app)
        .put("/api/notifikasi/abc/unread")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(400);
    });

    it("404 - notifikasi unread tidak ditemukan", async () => {
      (db.update as jest.Mock).mockReturnValue(updateReturningChain([]));

      const res = await request(app)
        .put("/api/notifikasi/999/unread")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/notifikasi/read-all", () => {
    it("200 - tandai semua notifikasi unread menjadi read", async () => {
      (db.update as jest.Mock).mockReturnValue(updateReturningChain([
        { ...mockNotification, status: "read" },
        { ...mockNotification, id: 2, status: "read" },
      ]));

      const res = await request(app)
        .put("/api/notifikasi/read-all")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("2 notifikasi");
    });

    it("500 - error saat read-all", async () => {
      (db.update as jest.Mock).mockImplementation(() => {
        throw new Error("DB error");
      });

      const res = await request(app)
        .put("/api/notifikasi/read-all")
        .set("Authorization", TOKEN);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Gagal memperbarui notifikasi");
    });
  });
});
