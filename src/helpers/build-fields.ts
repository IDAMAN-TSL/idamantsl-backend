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

// ─── buildPengedaranFields (dipakai pengedaran-dn & pengedaran-ln) ────────────

export const buildPengedaranFields = (body: Record<string, unknown>) => ({
    ...("nomor" in body && { nomor: (body.nomor as string) ?? null }),
    ...("namaPengedaran" in body && { namaPengedaran: body.namaPengedaran as string }),
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
    ...("alamatPengedaran" in body && {
        alamatPengedaran: (body.alamatPengedaran as string) ?? null,
    }),
    ...("koordinatLokasi" in body && {
        koordinatLokasi: (body.koordinatLokasi as string) ?? null,
    }),
    ...("tslId" in body && { tslId: body.tslId ? Number(body.tslId) : null }),
    ...("statusPerlindunganNasional" in body && {
        statusPerlindunganNasional:
            (body.statusPerlindunganNasional as PengedaranInsert["statusPerlindunganNasional"]) ?? null,
    }),
    ...("statusCites" in body && {
        statusCites: (body.statusCites as PengedaranInsert["statusCites"]) ?? null,
    }),
    ...("statusIucn" in body && {
        statusIucn: (body.statusIucn as PengedaranInsert["statusIucn"]) ?? null,
    }),
    ...("jantan" in body && { jantan: body.jantan !== null ? Number(body.jantan) : null }),
    ...("betina" in body && { betina: body.betina !== null ? Number(body.betina) : null }),
});

// ─── buildLembagaFields ───────────────────────────────────────────────────────

export const buildLembagaFields = (body: Record<string, unknown>) => ({
    ...("nomor" in body && { nomor: (body.nomor as string) ?? null }),
    ...("namaLembaga" in body && { namaLembaga: body.namaLembaga as string }),
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
    ...("alamatLembaga" in body && { alamatLembaga: (body.alamatLembaga as string) ?? null }),
    ...("koordinatLokasi" in body && {
        koordinatLokasi: (body.koordinatLokasi as string) ?? null,
    }),
    ...("tslId" in body && { tslId: body.tslId ? Number(body.tslId) : null }),
    ...("statusPerlindunganNasional" in body && {
        statusPerlindunganNasional:
            (body.statusPerlindunganNasional as LembagaInsert["statusPerlindunganNasional"]) ?? null,
    }),
    ...("statusCites" in body && {
        statusCites: (body.statusCites as LembagaInsert["statusCites"]) ?? null,
    }),
    ...("statusIucn" in body && {
        statusIucn: (body.statusIucn as LembagaInsert["statusIucn"]) ?? null,
    }),
    ...("jantan" in body && { jantan: body.jantan !== null ? Number(body.jantan) : null }),
    ...("betina" in body && { betina: body.betina !== null ? Number(body.betina) : null }),
});
