import { Response } from "express";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  lembagaKonservasi,
  notifikasi,
  penangkaran,
  pengedaranDalamNegeri,
  pengedaranLuarNegeri,
  users,
} from "../../db/schema";
import { AuthRequest } from "../middlewares/auth.middleware";
import { handleError } from "../helpers/controller.helpers";

type TabelTarget =
  | "penangkaran"
  | "pengedaran_dalam_negeri"
  | "pengedaran_luar_negeri"
  | "lembaga_konservasi";

const EXPIRING_SK_MODULES: {
  table: any;
  tabelTarget: TabelTarget;
  label: string;
}[] = [
  { table: penangkaran, tabelTarget: "penangkaran", label: "Penangkaran" },
  { table: pengedaranDalamNegeri, tabelTarget: "pengedaran_dalam_negeri", label: "Pengedaran dalam negeri" },
  { table: pengedaranLuarNegeri, tabelTarget: "pengedaran_luar_negeri", label: "Pengedaran luar negeri" },
  { table: lembagaKonservasi, tabelTarget: "lembaga_konservasi", label: "Lembaga konservasi" },
];

function oneYearFromNow() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date;
}

async function syncExpiringSkNotifications(user: { id: number; role: string; wilayahId: number | null }) {
  const deadline = oneYearFromNow();

  for (const module of EXPIRING_SK_MODULES) {
    let condition;
    
    if (user.role === "admin_pusat") {
      condition = lte(module.table.akhirMasaBerlaku, deadline);
    } else {
      // Bidang Wilayah & Seksi Wilayah: hanya yang dibuat oleh dirinya sendiri
      condition = and(
        eq(module.table.createdBy, user.id),
        lte(module.table.akhirMasaBerlaku, deadline)
      );
    }

    const records = await db
      .select({
        id: module.table.id,
        nomorSk: module.table.nomorSk,
        akhirMasaBerlaku: module.table.akhirMasaBerlaku,
      })
      .from(module.table)
      .where(condition);

    for (const record of records) {
      const nomorSk = record.nomorSk ?? "-";
      const tanggal = record.akhirMasaBerlaku
        ? new Date(record.akhirMasaBerlaku).toISOString().slice(0, 10)
        : "-";

      await db
        .insert(notifikasi)
        .values({
          userId: user.id,
          status: "unread",
          tabelTarget: module.tabelTarget,
          targetId: record.id,
          nomorSk: record.nomorSk,
          tanggalKadaluarsa: record.akhirMasaBerlaku,
          judul: `SK ${module.label} akan kadaluarsa`,
          pesan: `Nomor SK ${nomorSk} akan kadaluarsa pada ${tanggal}`,
        })
        .onConflictDoNothing();
    }
  }
}

export async function getNotifikasi(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
    const user = req.user;
    const { status } = req.query;

    if (status && !["unread", "read", "all"].includes(status as string)) {
      return res.status(400).json({
        success: false,
        message: "Status notifikasi tidak valid. Gunakan: unread, read, atau all",
      });
    }

    await syncExpiringSkNotifications(user);

    const statusFilter = (status as string | undefined) ?? "all";
    const whereClause = statusFilter === "all"
      ? eq(notifikasi.userId, user.id)
      : and(eq(notifikasi.userId, user.id), eq(notifikasi.status, statusFilter as "unread" | "read"));

    const data = await db.query.notifikasi.findMany({
      where: whereClause,
      orderBy: desc(notifikasi.createdAt),
    });

    const unreadCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifikasi)
      .where(and(eq(notifikasi.userId, user.id), eq(notifikasi.status, "unread")));

    const nowTimestamp = Date.now();
    const enhancedData = data.map((item) => {
      let sisaHari = null;
      if (item.tanggalKadaluarsa) {
        const kadaluarsaTimestamp = new Date(item.tanggalKadaluarsa).getTime();
        const diffMs = kadaluarsaTimestamp - nowTimestamp;
        sisaHari = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }
      return { ...item, sisaHari };
    });

    return res.status(200).json({
      success: true,
      message: "Data notifikasi berhasil diambil",
      total: enhancedData.length,
      unreadCount: unreadCount[0]?.count ?? 0,
      data: enhancedData,
    });
  } catch (error) {
    return handleError(res, error, "getNotifikasi", "Gagal mengambil data notifikasi");
  }
}

export async function markNotifikasiRead(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID tidak valid" });
    }

    const [updated] = await db
      .update(notifikasi)
      .set({ status: "read", readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notifikasi.id, id), eq(notifikasi.userId, req.user.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: "Notifikasi tidak ditemukan" });
    }

    return res.status(200).json({ success: true, message: "Notifikasi ditandai sudah dibaca", data: updated });
  } catch (error) {
    return handleError(res, error, "markNotifikasiRead", "Gagal memperbarui notifikasi");
  }
}

export async function markNotifikasiUnread(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID tidak valid" });
    }

    const [updated] = await db
      .update(notifikasi)
      .set({ status: "unread", readAt: null, updatedAt: new Date() })
      .where(and(eq(notifikasi.id, id), eq(notifikasi.userId, req.user.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: "Notifikasi tidak ditemukan" });
    }

    return res.status(200).json({ success: true, message: "Notifikasi ditandai belum dibaca", data: updated });
  } catch (error) {
    return handleError(res, error, "markNotifikasiUnread", "Gagal memperbarui notifikasi");
  }
}

export async function markAllNotifikasiRead(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
    const data = await db
      .update(notifikasi)
      .set({ status: "read", readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notifikasi.userId, req.user.id), eq(notifikasi.status, "unread")))
      .returning();

    return res.status(200).json({
      success: true,
      message: `${data.length} notifikasi ditandai sudah dibaca`,
      data,
    });
  } catch (error) {
    return handleError(res, error, "markAllNotifikasiRead", "Gagal memperbarui notifikasi");
  }
}

export async function toggleNotificationSettings(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { statusNotifikasi } = req.body;
    
    if (typeof statusNotifikasi !== "boolean") {
      return res.status(400).json({ success: false, message: "statusNotifikasi harus berupa boolean (true/false)" });
    }

    await db
      .update(users)
      .set({ statusNotifikasi, updatedAt: new Date() })
      .where(eq(users.id, req.user.id));

    return res.status(200).json({
      success: true,
      message: `Status notifikasi berhasil diubah menjadi ${statusNotifikasi ? 'Aktif' : 'Nonaktif'}`,
      data: { statusNotifikasi }
    });
  } catch (error) {
    return handleError(res, error, "toggleNotificationSettings", "Gagal mengubah pengaturan notifikasi");
  }
}
