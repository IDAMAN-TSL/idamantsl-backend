/**
 * build-fields.ts
 *
 * Fungsi pembangun objek fields dari request body untuk tiap modul.
 * Hanya menyertakan field yang ada di body (partial update safe).
 */

import type { InferInsertModel } from "drizzle-orm";
import { pengedaranDalamNegeri } from "../../db/schema";
import { lembagaKonservasi } from "../../db/schema";

type PengedaranInsert = InferInsertModel<typeof pengedaranDalamNegeri>;
type LembagaInsert = InferInsertModel<typeof lembagaKonservasi>;

// ─── buildBaseFields (shared oleh semua modul) ───────────────────────────────
// Kolom yang persis sama di pengedaran-dn, pengedaran-ln, lembaga-konservasi,
// DAN penangkaran.

function buildBaseFields(
    body: Record<string, unknown>,
    statusTypes: {
        statusPerlindunganNasional?: unknown;
        statusCites?: unknown;
        statusIucn?: unknown;
    }
) {
    return {
        ...("nomor" in body && { nomor: (body.nomor as string) ?? null }),
        ...("nomorSk" in body && { nomorSk: (body.nomorSk as string) ?? null }),
        ...("tanggalSk" in body && {
            tanggalSk: body.tanggalSk ? new Date(body.tanggalSk as string) : null,
        }),
        ...("fileSk" in body && { fileSk: (body.fileSk as string) ?? null }),
        ...("penerbit" in body && { penerbit: (body.penerbit as string) ?? null }),
        ...("akhirMasaBerlaku" in body && {
            akhirMasaBerlaku: body.akhirMasaBerlaku
                ? new Date(body.akhirMasaBerlaku as string)
                : null,
        }),
        ...("namaDirektur" in body && { namaDirektur: (body.namaDirektur as string) ?? null }),
        ...("nomorTelepon" in body && { nomorTelepon: (body.nomorTelepon as string) ?? null }),
        ...("bidangWilayahId" in body && {
            bidangWilayahId: body.bidangWilayahId ? Number(body.bidangWilayahId) : null,
        }),
        ...("seksiWilayahId" in body && {
            seksiWilayahId: body.seksiWilayahId ? Number(body.seksiWilayahId) : null,
        }),
        ...("alamatKantor" in body && { alamatKantor: (body.alamatKantor as string) ?? null }),
        ...("koordinatLokasi" in body && {
            koordinatLokasi: (body.koordinatLokasi as string) ?? null,
        }),
        ...("tslId" in body && { tslId: body.tslId ? Number(body.tslId) : null }),
        ...("statusPerlindunganNasional" in body && {
            statusPerlindunganNasional:
                (body.statusPerlindunganNasional as typeof statusTypes.statusPerlindunganNasional) ?? null,
        }),
        ...("statusCites" in body && {
            statusCites: (body.statusCites as typeof statusTypes.statusCites) ?? null,
        }),
        ...("statusIucn" in body && {
            statusIucn: (body.statusIucn as typeof statusTypes.statusIucn) ?? null,
        }),
        ...("jantan" in body && { jantan: body.jantan !== null ? Number(body.jantan) : null }),
        ...("betina" in body && { betina: body.betina !== null ? Number(body.betina) : null }),
    };
}

// ─── buildPengedaranFields (pengedaran-dn & pengedaran-ln) ───────────────────

export const buildPengedaranFields = (body: Record<string, unknown>) => ({
    ...buildBaseFields(body, {} as PengedaranInsert),
    ...("namaPengedaran" in body && { namaPengedaran: body.namaPengedaran as string }),
    ...("alamatPengedaran" in body && {
        alamatPengedaran: (body.alamatPengedaran as string) ?? null,
    }),
});

// ─── buildLembagaFields ───────────────────────────────────────────────────────

export const buildLembagaFields = (body: Record<string, unknown>) => ({
    ...buildBaseFields(body, {} as LembagaInsert),
    ...("namaLembaga" in body && { namaLembaga: body.namaLembaga as string }),
    ...("alamatLembaga" in body && {
        alamatLembaga: (body.alamatLembaga as string) ?? null,
    }),
});
