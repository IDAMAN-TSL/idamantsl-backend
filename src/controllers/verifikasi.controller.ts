import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { verifikasiLog, referensiTsl, penangkaran } from "../../db/schema";

interface AuthUser {
  id: number;
  role: "admin_pusat" | "bidang_wilayah" | "seksi_wilayah";
}

interface AuthRequest extends Request {
  user?: AuthUser;
}

type TabelTarget =
  | "referensi_tsl"
  | "penangkaran"
  | "pengedaran_dalam_negeri"
  | "pengedaran_luar_negeri"
  | "lembaga_konservasi";
const VALID_TABEL: TabelTarget[] = [
  "referensi_tsl",
  "penangkaran",
  "pengedaran_dalam_negeri",
  "pengedaran_luar_negeri",
  "lembaga_konservasi",
];
async function findRecord(tabel: TabelTarget, targetId: number) {
  switch (tabel) {
    case "referensi_tsl":
      return (await db.select().from(referensiTsl).where(eq(referensiTsl.id, targetId)).limit(1))[0] ?? null;
    case "penangkaran":
      return (await db.select().from(penangkaran).where(eq(penangkaran.id, targetId)).limit(1))[0] ?? null;
    default:
      return null;
  }
}
// Helper generik untuk update berdasarkan tabel
async function updateRecord(tabel: TabelTarget, targetId: number, data: Record<string, unknown>) {
  switch (tabel) {
    case "referensi_tsl":
      await db.update(referensiTsl).set(data).where(eq(referensiTsl.id, targetId));
      break;
    case "penangkaran":
      await db.update(penangkaran).set(data).where(eq(penangkaran.id, targetId));
      break;
  }
}

async function applyChanges(tabel: TabelTarget, targetId: number, changes: Record<string, unknown>) {
  await updateRecord(tabel, targetId, {
    ...changes,
    pendingChanges: null,
    statusVerifikasi: "disetujui",
    updatedAt: new Date(),
  });
}

async function rejectRecord(tabel: TabelTarget, targetId: number, catatan: string) {
  await updateRecord(tabel, targetId, {
    statusVerifikasi: "ditolak",
    catatanVerifikasi: catatan,
    pendingChanges: null,
    updatedAt: new Date(),
  });
}
async function deleteRecord(tabel: TabelTarget, targetId: number) {
  switch (tabel) {
    case "referensi_tsl":
      await db.delete(referensiTsl).where(eq(referensiTsl.id, targetId));
      break;
    case "penangkaran":
      await db.delete(penangkaran).where(eq(penangkaran.id, targetId));
      break;
  }
}
export async function approveData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const { tabelTarget, targetId, catatan } = req.body;

    if (!tabelTarget || !targetId) {
      res.status(400).json({ message: "tabelTarget dan targetId wajib diisi" });
      return;
    }

    if (!VALID_TABEL.includes(tabelTarget)) {
      res.status(400).json({ message: "tabelTarget tidak valid" });
      return;
    }

    const record = await findRecord(tabelTarget, Number(targetId));
    if (!record) {
      res.status(404).json({ message: "Data tidak ditemukan" });
      return;
    }

    if (record.statusVerifikasi !== "pending") {
      res.status(400).json({ message: `Data tidak dalam status pending (status saat ini: ${record.statusVerifikasi})` });
      return;
    }

    // Cek apakah ini pengajuan penghapusan
    const pendingChanges = (record as Record<string, unknown>).pendingChanges as Record<string, unknown> | null;
    const isDeleteRequest = pendingChanges?._action === "delete";

    if (isDeleteRequest) {
      // Approve penghapusan → hapus data
      await deleteRecord(tabelTarget, Number(targetId));

      await db.insert(verifikasiLog).values({
        tabelTarget,
        targetId: Number(targetId),
        status: "disetujui",
        catatan: catatan ?? "Pengajuan penghapusan disetujui",
        verifikasiOleh: user.id,
      });

      res.status(200).json({ message: "Pengajuan penghapusan disetujui, data telah dihapus" });
      return;
    }

    // Approve perubahan data → terapkan pendingChanges ke data utama
    const changes = pendingChanges ?? {};
    await applyChanges(tabelTarget, Number(targetId), changes as Record<string, unknown>);

    await db.insert(verifikasiLog).values({
      tabelTarget,
      targetId: Number(targetId),
      status: "disetujui",
      catatan: catatan ?? null,
      verifikasiOleh: user.id,
    });

    res.status(200).json({ message: "Data berhasil disetujui" });
  } catch (error) {
    console.error("[ERROR] approveData:", error);
    res.status(500).json({ message: "Gagal menyetujui data" });
  }
}
export async function tolakData(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = req.user!;
    const { tabelTarget, targetId, catatan } = req.body;

    if (!tabelTarget || !targetId) {
      res.status(400).json({ message: "tabelTarget dan targetId wajib diisi" });
      return;
    }

    if (!catatan || catatan.trim() === "") {
      res.status(400).json({ message: "Catatan wajib diisi saat menolak data" });
      return;
    }

    if (!VALID_TABEL.includes(tabelTarget)) {
      res.status(400).json({ message: "tabelTarget tidak valid" });
      return;
    }

    const record = await findRecord(tabelTarget, Number(targetId));
    if (!record) {
      res.status(404).json({ message: "Data tidak ditemukan" });
      return;
    }

    if (record.statusVerifikasi !== "pending") {
      res.status(400).json({ message: `Data tidak dalam status pending (status saat ini: ${record.statusVerifikasi})` });
      return;
    }

    await rejectRecord(tabelTarget, Number(targetId), catatan);

    await db.insert(verifikasiLog).values({
      tabelTarget,
      targetId: Number(targetId),
      status: "ditolak",
      catatan,
      verifikasiOleh: user.id,
    });

    res.status(200).json({ message: "Data berhasil ditolak", catatan });
  } catch (error) {
    console.error("[ERROR] tolakData:", error);
    res.status(500).json({ message: "Gagal menolak data" });
  }
}
export async function getDataPending(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Ambil semua data pending dari semua tabel
    const [referensiPending, penangkaranPending] = await Promise.all([
      db.select({
        id: referensiTsl.id,
        namaDaerah: referensiTsl.namaDaerah,
        jenis: referensiTsl.jenis,
        statusVerifikasi: referensiTsl.statusVerifikasi,
        pendingChanges: referensiTsl.pendingChanges,
        createdBy: referensiTsl.createdBy,
        updatedAt: referensiTsl.updatedAt,
      }).from(referensiTsl).where(eq(referensiTsl.statusVerifikasi, "pending")),

      db.select({
        id: penangkaran.id,
        namaPenangkaran: penangkaran.namaPenangkaran,
        statusVerifikasi: penangkaran.statusVerifikasi,
        createdBy: penangkaran.createdBy,
        updatedAt: penangkaran.updatedAt,
      }).from(penangkaran).where(eq(penangkaran.statusVerifikasi, "pending")),
    ]);

    res.status(200).json({
      data: {
        referensi_tsl: referensiPending.map(r => ({ ...r, tabelTarget: "referensi_tsl" })),
        penangkaran: penangkaranPending.map(p => ({ ...p, tabelTarget: "penangkaran" })),
      },
    });
  } catch (error) {
    console.error("[ERROR] getDataPending:", error);
    res.status(500).json({ message: "Gagal mengambil data pending" });
  }
}
export async function getVerifikasiLog(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db
      .select()
      .from(verifikasiLog)
      .orderBy(verifikasiLog.createdAt);

    res.status(200).json({ data: result });
  } catch (error) {
    console.error("[ERROR] getVerifikasiLog:", error);
    res.status(500).json({ message: "Gagal mengambil log verifikasi" });
  }
}