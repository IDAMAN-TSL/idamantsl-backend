/**
 * module.factory.ts
 *
 * Factory untuk membuat controller CRUD + pendingChanges workflow
 * yang identik antara pengedaran-dn, pengedaran-ln, dan lembaga-konservasi.
 *
 * Cara pakai:
 *   const ctrl = createModuleController({
 *     table: pengedaranDalamNegeri,
 *     entityName: "pengedaran dalam negeri",
 *     queryKey: "pengedaranDalamNegeri",
 *     namaFieldKey: "namaPengedaran",
 *     buildFields: buildPengedaranFields,
 *   });
 */

import { Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { AuthRequest } from "../middlewares/auth.middleware";
import { isNotOwner, bulkDeleteHandler, handleError } from "./controller.helpers";
import { uploadFile, deleteFile } from "./azure-storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = any;

// ─── relasi yang dimuat untuk GET ────────────────────────────────────────────

const withRelations = {
    bidangWilayah: true,
    seksiWilayah: true,
    tsl: true,
    createdBy: { columns: { id: true, nama: true, role: true } },
} as const;

// ─── Opsi factory ────────────────────────────────────────────────────────────

interface ModuleControllerOptions {
    table: AnyTable;
    entityName: string;
    queryKey: keyof typeof db.query;
    namaFieldKey: string;
    buildFields: (body: Record<string, unknown>) => Record<string, unknown>;
}

// ─── createModuleController ───────────────────────────────────────────────────

export function createModuleController(opts: ModuleControllerOptions) {
    const { table, entityName, queryKey, namaFieldKey, buildFields } = opts;

    const EntityName =
        entityName.charAt(0).toUpperCase() + entityName.slice(1);

    // ── findById ──────────────────────────────────────────────────────────────
    async function findById(id: number): Promise<Record<string, unknown> | null> {
        const query = (db.query as Record<string, unknown>)[queryKey as string] as {
            findFirst: (o: { where: ReturnType<typeof eq> }) => Promise<Record<string, unknown> | undefined>;
        };
        return (await query.findFirst({ where: eq(table.id, id) })) ?? null;
    }

    // ── markPending ───────────────────────────────────────────────────────────
    async function markPending(
        id: number,
        pendingChanges: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const result: Record<string, unknown>[] = await db
            .update(table)
            .set({ pendingChanges, statusVerifikasi: "pending", updatedAt: new Date() })
            .where(eq(table.id, id))
            .returning();
        return result[0];
    }

    // ── GET /api/<module> ─────────────────────────────────────────────────────
    const getAll = async (req: AuthRequest, res: Response) => {
        try {
            const { status } = req.query;
            const validStatus = ["pending", "disetujui", "ditolak", "all"];

            if (status && !validStatus.includes(status as string)) {
                return res.status(400).json({
                    success: false,
                    message: "Status tidak valid. Gunakan: pending, disetujui, ditolak, atau all",
                });
            }

            const statusFilter = (status as string | undefined) ?? "disetujui";

            const queryRunner = (db.query as Record<string, unknown>)[queryKey as string] as {
                findMany: (o: unknown) => Promise<unknown[]>;
            };

            const data = await queryRunner.findMany({
                where: statusFilter === "all" ? undefined : eq(table.statusVerifikasi, statusFilter),
                orderBy: desc(table.createdAt),
                with: withRelations,
            });

            return res.status(200).json({
                success: true,
                message: `Data ${entityName} berhasil diambil`,
                total: data.length,
                data,
            });
        } catch (error) {
            return handleError(res, error, `getAll${EntityName}`);
        }
    };

    // ── GET /api/<module>/:id ─────────────────────────────────────────────────
    const getById = async (req: AuthRequest, res: Response) => {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: "ID tidak valid" });
            }

            const queryRunner = (db.query as Record<string, unknown>)[queryKey as string] as {
                findFirst: (o: unknown) => Promise<unknown | null | undefined>;
            };

            const data = await queryRunner.findFirst({
                where: eq(table.id, id),
                with: {
                    ...withRelations,
                    updatedBy: { columns: { id: true, nama: true, role: true } },
                },
            });

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: `Data ${entityName} tidak ditemukan`,
                });
            }

            return res.status(200).json({
                success: true,
                message: `Data ${entityName} berhasil diambil`,
                data,
            });
        } catch (error) {
            return handleError(res, error, `getById${EntityName}`);
        }
    };

    // ── POST /api/<module> ────────────────────────────────────────────────────
    const create = async (req: AuthRequest, res: Response) => {
        try {
            const namaValue = req.body[namaFieldKey];
            if (!namaValue) {
                return res.status(400).json({
                    success: false,
                    message: `${namaFieldKey} wajib diisi`,
                });
            }

            let fileSk: string | null = null;
            if (req.file) {
                fileSk = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
            }

            const statusVerifikasi = req.user?.role === "admin_pusat" ? "disetujui" : "pending";

            const result = (await db
                .insert(table)
                .values({ ...buildFields(req.body), fileSk, statusVerifikasi, createdBy: req.user?.id })
                .returning()) as Record<string, unknown>[];

            return res.status(201).json({
                success: true,
                message:
                    statusVerifikasi === "pending"
                        ? `Data ${entityName} berhasil ditambahkan, menunggu verifikasi Admin Pusat`
                        : `Data ${entityName} berhasil ditambahkan`,
                data: result[0],
            });
        } catch (error) {
            return handleError(res, error, `create${EntityName}`);
        }
    };

    // ── PUT /api/<module>/:id ─────────────────────────────────────────────────
    const update = async (req: AuthRequest, res: Response) => {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: "ID tidak valid" });
            }

            const existing = await findById(id);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: `Data ${entityName} tidak ditemukan`,
                });
            }

            if (isNotOwner(req.user?.role, existing.createdBy as number | null, req.user?.id)) {
                return res.status(403).json({
                    success: false,
                    message: "Anda tidak memiliki izin mengubah data ini",
                });
            }

            // bidang_wilayah → simpan ke pendingChanges
            if (req.user?.role === "bidang_wilayah") {
                let fileSk: string | null | undefined = undefined;
                if (req.file) {
                    fileSk = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
                }

                const fields = buildFields(req.body);
                const data = await markPending(id, {
                    ...fields,
                    ...(fileSk !== undefined ? { fileSk } : {}),
                    diajukanOleh: req.user.id,
                });

                return res.status(200).json({
                    success: true,
                    message: `Perubahan ${entityName} telah diajukan, menunggu persetujuan Admin Pusat`,
                    data,
                });
            }

            // admin_pusat → langsung update
            let fileSk = existing.fileSk as string | null;
            if (req.file) {
                if (existing.fileSk) await deleteFile(existing.fileSk as string);
                fileSk = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
            }

            const result = (await db
                .update(table)
                .set({
                    ...buildFields(req.body),
                    ...("fileSk" in req.body || req.file ? { fileSk } : {}),
                    updatedBy: req.user?.id,
                    updatedAt: new Date(),
                })
                .where(eq(table.id, id))
                .returning()) as Record<string, unknown>[];

            return res.status(200).json({
                success: true,
                message: `Data ${entityName} berhasil diubah`,
                data: result[0],
            });
        } catch (error) {
            return handleError(res, error, `update${EntityName}`);
        }
    };

    // ── DELETE /api/<module>/:id ──────────────────────────────────────────────
    const remove = async (req: AuthRequest, res: Response) => {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ success: false, message: "ID tidak valid" });
            }

            const existing = await findById(id);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: `Data ${entityName} tidak ditemukan`,
                });
            }

            if (isNotOwner(req.user?.role, existing.createdBy as number | null, req.user?.id)) {
                return res.status(403).json({
                    success: false,
                    message: "Anda tidak memiliki izin menghapus data ini",
                });
            }

            // bidang_wilayah → soft delete
            if (req.user?.role === "bidang_wilayah") {
                await markPending(id, { _action: "delete", diajukanOleh: req.user.id });
                return res.status(200).json({
                    success: true,
                    message: "Pengajuan penghapusan dikirim, menunggu persetujuan Admin Pusat",
                });
            }

            // admin_pusat → hard delete
            await db.delete(table).where(eq(table.id, id));

            return res.status(200).json({
                success: true,
                message: `Data ${entityName} berhasil dihapus`,
            });
        } catch (error) {
            return handleError(res, error, `delete${EntityName}`);
        }
    };

    // ── DELETE /api/<module>/bulk ─────────────────────────────────────────────
    const bulkDelete = async (req: AuthRequest, res: Response) => {
        try {
            // cast findById agar cocok dengan signature bulkDeleteHandler
            const findByIdForBulk = (id: number) =>
                findById(id) as Promise<{ createdBy: number | null } | null | undefined>;
            return await bulkDeleteHandler(req, res, table, findByIdForBulk, entityName);
        } catch (error) {
            return handleError(res, error, `bulkDelete${EntityName}`);
        }
    };

    return { getAll, getById, create, update, remove, bulkDelete };
}
