import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  verifikasiLog,
  referensiTsl,
  penangkaran,
  users,
} from "../../db/schema";

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

type JenisPengajuan = "tambah" | "perbarui" | "hapus";

type TableDef = {
  find: (id: number) => Promise<Record<string, unknown> | null>;
  update: (id: number, data: Record<string, unknown>) => Promise<void>;
  delete: (id: number) => Promise<void>;
};

// ─── Table Registry ───────────────────────────────────────────────────────────

const TABLE_REGISTRY: Partial<Record<TabelTarget, TableDef>> = {
  referensi_tsl: {
    find: async (id) =>
      (
        await db
          .select()
          .from(referensiTsl)
          .where(eq(referensiTsl.id, id))
          .limit(1)
      )[0] ?? null,
    update: async (id, data) =>
      void (await db
        .update(referensiTsl)
        .set(data)
        .where(eq(referensiTsl.id, id))),
    delete: async (id) =>
      void (await db.delete(referensiTsl).where(eq(referensiTsl.id, id))),
  },
  penangkaran: {
    find: async (id) =>
      (
        await db
          .select()
          .from(penangkaran)
          .where(eq(penangkaran.id, id))
          .limit(1)
      )[0] ?? null,
    update: async (id, data) =>
      void (await db
        .update(penangkaran)
        .set(data)
        .where(eq(penangkaran.id, id))),
    delete: async (id) =>
      void (await db.delete(penangkaran).where(eq(penangkaran.id, id))),
  },
};

const VALID_TABEL = Object.keys(TABLE_REGISTRY) as TabelTarget[];

function getTableDef(tabel: TabelTarget): TableDef {
  const def = TABLE_REGISTRY[tabel];
  if (!def) throw new Error(`Tabel "${tabel}" tidak terdaftar di registry`);
  return def;
}

// ─── Helper: Tentukan jenis pengajuan ────────────────────────────────────────

function getJenisPengajuan(
  pendingChanges: Record<string, unknown> | null,
): JenisPengajuan {
  if (pendingChanges?._action === "delete") return "hapus";
  if (pendingChanges && Object.keys(pendingChanges).length > 0)
    return "perbarui";
  // pendingChanges null = data baru yang belum disetujui (tambah)
  return "tambah";
}

// ─── Helper: Insert log verifikasi ───────────────────────────────────────────

async function insertVerifikasiLog(
  tabelTarget: TabelTarget,
  targetId: number,
  status: "disetujui" | "ditolak" | "pending",
  jenisPengajuan: JenisPengajuan,
  createdBy: number | null,
  verifikasiOleh: number,
  catatan?: string | null,
) {
  await db.insert(verifikasiLog).values({
    tabelTarget,
    targetId,
    status,
    jenisPengajuan,
    createdBy,
    verifikasiOleh,
    catatan: catatan ?? null,
  });
}

// ─── Helper: Validasi field dasar ────────────────────────────────────────────

function validateBaseFields(
  tabelTarget: unknown,
  targetId: unknown,
): string | null {
  if (!tabelTarget || !targetId) return "tabelTarget dan targetId wajib diisi";
  if (!VALID_TABEL.includes(tabelTarget as TabelTarget))
    return "tabelTarget tidak valid";
  return null;
}

// ─── Helper: Cari record dengan status pending ────────────────────────────────

async function findPendingRecord(
  tabel: TabelTarget,
  targetId: number,
): Promise<
  { record: Record<string, unknown> } | { error: string; status: number }
> {
  const record = await getTableDef(tabel).find(targetId);
  if (!record) return { error: "Data tidak ditemukan", status: 404 };
  if (record.statusVerifikasi !== "pending") {
    return {
      error: `Data tidak dalam status pending (status saat ini: ${record.statusVerifikasi})`,
      status: 400,
    };
  }
  return { record };
}

// ─── Helper: Ambil nama inputor dari users ────────────────────────────────────

async function getNamaInputor(
  createdBy: number | null,
): Promise<string | null> {
  if (!createdBy) return null;
  const result = await db
    .select({ nama: users.nama })
    .from(users)
    .where(eq(users.id, createdBy))
    .limit(1);
  return result[0]?.nama ?? null;
}

// ─── GET /api/verifikasi/pending ──────────────────────────────────────────────

export async function getDataPending(
  _req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const [referensiPending, penangkaranPending] = await Promise.all([
      db
        .select({
          id: referensiTsl.id,
          namaDaerah: referensiTsl.namaDaerah,
          jenis: referensiTsl.jenis,
          statusVerifikasi: referensiTsl.statusVerifikasi,
          pendingChanges: referensiTsl.pendingChanges,
          createdBy: referensiTsl.createdBy,
          updatedAt: referensiTsl.updatedAt,
        })
        .from(referensiTsl)
        .where(eq(referensiTsl.statusVerifikasi, "pending")),

      db
        .select({
          id: penangkaran.id,
          namaPenangkaran: penangkaran.namaPenangkaran,
          statusVerifikasi: penangkaran.statusVerifikasi,
          pendingChanges: penangkaran.pendingChanges,
          createdBy: penangkaran.createdBy,
          updatedAt: penangkaran.updatedAt,
        })
        .from(penangkaran)
        .where(eq(penangkaran.statusVerifikasi, "pending")),
    ]);

    // Ambil semua user sekaligus untuk mapping nama inputor
    const allUsers = await db
      .select({ id: users.id, nama: users.nama })
      .from(users);
    const userMap: Record<number, string> = {};
    allUsers.forEach((u) => {
      userMap[u.id] = u.nama;
    });

    const referensiMapped = referensiPending.map((r) => {
      const pendingChanges = r.pendingChanges as Record<string, unknown> | null;
      return {
        ...r,
        tabelTarget: "referensi_tsl",
        jenisPengajuan: getJenisPengajuan(pendingChanges),
        namaInputor: r.createdBy ? (userMap[r.createdBy] ?? null) : null,
      };
    });

    const penangkaranMapped = penangkaranPending.map((p) => {
      const pendingChanges = p.pendingChanges as Record<string, unknown> | null;
      return {
        ...p,
        tabelTarget: "penangkaran",
        jenisPengajuan: getJenisPengajuan(pendingChanges),
        namaInputor: p.createdBy ? (userMap[p.createdBy] ?? null) : null,
      };
    });

    res.status(200).json({
      data: {
        referensi_tsl: referensiMapped,
        penangkaran: penangkaranMapped,
      },
      total: referensiMapped.length + penangkaranMapped.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data pending" });
  }
}

// ─── GET /api/verifikasi/approved ─────────────────────────────────────────────

export async function getDataApproved(
  _req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const [referensiApproved, penangkaranApproved] = await Promise.all([
      db
        .select({
          id: referensiTsl.id,
          namaDaerah: referensiTsl.namaDaerah,
          jenis: referensiTsl.jenis,
          statusVerifikasi: referensiTsl.statusVerifikasi,
          createdBy: referensiTsl.createdBy,
          updatedAt: referensiTsl.updatedAt,
        })
        .from(referensiTsl)
        .where(eq(referensiTsl.statusVerifikasi, "disetujui")),

      db
        .select({
          id: penangkaran.id,
          namaPenangkaran: penangkaran.namaPenangkaran,
          statusVerifikasi: penangkaran.statusVerifikasi,
          createdBy: penangkaran.createdBy,
          updatedAt: penangkaran.updatedAt,
        })
        .from(penangkaran)
        .where(eq(penangkaran.statusVerifikasi, "disetujui")),
    ]);

    res.status(200).json({
      data: {
        referensi_tsl: referensiApproved.map((r) => ({
          ...r,
          tabelTarget: "referensi_tsl",
        })),
        penangkaran: penangkaranApproved.map((p) => ({
          ...p,
          tabelTarget: "penangkaran",
        })),
      },
      total: referensiApproved.length + penangkaranApproved.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data approved" });
  }
}

// ─── POST /api/verifikasi/approve ─────────────────────────────────────────────

export async function approveData(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const user = req.user!;
    const { tabelTarget, targetId, catatan } = req.body;

    const validationError = validateBaseFields(tabelTarget, targetId);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const result = await findPendingRecord(tabelTarget, Number(targetId));
    if ("error" in result) {
      res.status(result.status).json({ message: result.error });
      return;
    }

    const { record } = result;
    const tableDef = getTableDef(tabelTarget);
    const pendingChanges = record.pendingChanges as Record<
      string,
      unknown
    > | null;
    const isDeleteRequest = pendingChanges?._action === "delete";
    const jenisPengajuan = getJenisPengajuan(pendingChanges);
    const diajukanOleh = (record.createdBy as number | null) ?? null;

    if (isDeleteRequest) {
      await tableDef.delete(Number(targetId));
      await insertVerifikasiLog(
        tabelTarget,
        Number(targetId),
        "disetujui",
        jenisPengajuan,
        diajukanOleh,
        user.id,
        catatan ?? "Pengajuan penghapusan disetujui",
      );
      res.status(200).json({
        message: "Pengajuan penghapusan disetujui, data telah dihapus",
      });
      return;
    }

    await tableDef.update(Number(targetId), {
      ...(pendingChanges ?? {}),
      pendingChanges: null,
      statusVerifikasi: "disetujui",
      updatedAt: new Date(),
    });

    await insertVerifikasiLog(
      tabelTarget,
      Number(targetId),
      "disetujui",
      jenisPengajuan,
      diajukanOleh,
      user.id,
      catatan,
    );

    res.status(200).json({ message: "Data berhasil disetujui" });
  } catch (error) {
    res.status(500).json({ message: "Gagal menyetujui data" });
  }
}

// ─── POST /api/verifikasi/tolak ───────────────────────────────────────────────

export async function tolakData(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const user = req.user!;
    const { tabelTarget, targetId, catatan } = req.body;

    const validationError = validateBaseFields(tabelTarget, targetId);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    if (!catatan?.trim()) {
      res
        .status(400)
        .json({ message: "Catatan wajib diisi saat menolak data" });
      return;
    }

    const result = await findPendingRecord(tabelTarget, Number(targetId));
    if ("error" in result) {
      res.status(result.status).json({ message: result.error });
      return;
    }

    const { record } = result;
    const pendingChanges = record.pendingChanges as Record<
      string,
      unknown
    > | null;
    const jenisPengajuan = getJenisPengajuan(pendingChanges);
    const diajukanOleh = (record.createdBy as number | null) ?? null;

    // Catatan: pendingChanges SENGAJA tidak di-null-kan saat penolakan.
    // Hal ini memungkinkan frontend non-admin membaca jenis pengajuan
    // (Perbarui / Hapus) dari record yang ditolak tanpa akses ke verifikasiLog.
    // Untuk penangkaran (yang tidak memiliki kolom pendingChanges),
    // Drizzle akan mengabaikan field ini secara otomatis.
    await getTableDef(tabelTarget).update(Number(targetId), {
      statusVerifikasi: "ditolak",
      catatanVerifikasi: catatan,
      updatedAt: new Date(),
    });

    await insertVerifikasiLog(
      tabelTarget,
      Number(targetId),
      "ditolak",
      jenisPengajuan,
      diajukanOleh,
      user.id,
      catatan,
    );

    res.status(200).json({ message: "Data berhasil ditolak", catatan });
  } catch (error) {
    res.status(500).json({ message: "Gagal menolak data" });
  }
}

// ─── GET /api/verifikasi/log ──────────────────────────────────────────────────

export async function getVerifikasiLog(
  _req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const result = await db
      .select()
      .from(verifikasiLog)
      .orderBy(verifikasiLog.createdAt);

    res.status(200).json({ data: result });
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil log verifikasi" });
  }
}
