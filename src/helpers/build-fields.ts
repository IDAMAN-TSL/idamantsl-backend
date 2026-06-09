/**
 * build-fields.ts
/**
 * build-fields.ts
 *
 * Fungsi pembangun objek fields dari request body untuk tiap modul.
 * Hanya menyertakan field yang ada di body (partial update safe).
 */

import type { InferInsertModel } from "drizzle-orm";
import { pengedaranDalamNegeri, penangkaran } from "../../db/schema";
import { lembagaKonservasi } from "../../db/schema";

type PenangkaranInsert = InferInsertModel<typeof penangkaran>;
type PengedaranInsert = InferInsertModel<typeof pengedaranDalamNegeri>;
type LembagaInsert = InferInsertModel<typeof lembagaKonservasi>;
type TslItemInput = {
    tslId?: unknown;
    statusPerlindunganNasional?: unknown;
    statusCites?: unknown;
    statusIucn?: unknown;
    jantan?: unknown;
    betina?: unknown;
};

const toNullableNumber = (value: unknown) => {
    if (value === undefined || value === null || value === "") return null;
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? null : numberValue;
};

export function normalizeTslFields(body: Record<string, unknown>): Record<string, unknown> {
    const hasTslItems = "tslItems" in body;
    const hasJumlahTsl = "jumlahTsl" in body;
    const hasTslId = "tslId" in body;

    if (!hasTslItems && !hasJumlahTsl && !hasTslId) return {};
    if (hasTslId && !hasTslItems && !hasJumlahTsl && !body.tslId) {
        return { tslId: null };
    }

    const rawJumlah = hasJumlahTsl ? Number(body.jumlahTsl) : undefined;
    const jumlahTsl = rawJumlah && rawJumlah > 0 ? rawJumlah : 1;
    
    let parsedTslItems = body.tslItems;
    if (typeof body.tslItems === "string") {
        try { parsedTslItems = JSON.parse(body.tslItems); } catch (e) { /* ignore */ }
    }
    const rawItems = Array.isArray(parsedTslItems) ? parsedTslItems as TslItemInput[] : [];

    const tslItems = rawItems.length > 0
        ? rawItems.map((item) => ({
            tslId: Number(item.tslId),
            statusPerlindunganNasional: (item.statusPerlindunganNasional as string | null | undefined) ?? null,
            statusCites: (item.statusCites as string | null | undefined) ?? null,
            statusIucn: (item.statusIucn as string | null | undefined) ?? null,
            jantan: toNullableNumber(item.jantan),
            betina: toNullableNumber(item.betina),
        }))
        : hasTslId && body.tslId
            ? [{
                tslId: Number(body.tslId),
                statusPerlindunganNasional: (body.statusPerlindunganNasional as string | null | undefined) ?? null,
                statusCites: (body.statusCites as string | null | undefined) ?? null,
                statusIucn: (body.statusIucn as string | null | undefined) ?? null,
                jantan: toNullableNumber(body.jantan),
                betina: toNullableNumber(body.betina),
            }]
            : [];

    return {
        ...(hasJumlahTsl || hasTslItems || tslItems.length > 0 ? { jumlahTsl, tslItems } : {}),
        tslId: tslItems[0]?.tslId ?? null,
    };
}

export function validateTslFields(fields: Record<string, unknown>) {
    if (!("jumlahTsl" in fields) && !("tslItems" in fields)) return null;

    const jumlahTsl = Number(fields.jumlahTsl ?? 1);
    const tslItems = Array.isArray(fields.tslItems) ? fields.tslItems as { tslId?: unknown }[] : [];

    if (!Number.isInteger(jumlahTsl) || jumlahTsl < 1 || jumlahTsl > 10) {
        return "Jumlah TSL wajib berupa angka antara 1 hingga 10";
    }

    if (tslItems.length !== jumlahTsl) {
        return `Jumlah item referensi TSL harus sesuai dengan jumlahTsl (${jumlahTsl})`;
    }

    const tslIds = tslItems.map((item) => Number(item.tslId));
    if (tslIds.some((id) => !Number.isInteger(id) || id < 1)) {
        return "Setiap item referensi TSL wajib memiliki tslId yang valid";
    }

    if (new Set(tslIds).size !== tslIds.length) {
        return "Referensi TSL dalam satu data tidak boleh duplikat";
    }

    return null;
}

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
        ...normalizeTslFields(body),
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

export const buildPengedaranFields = (body: Record<string, unknown>): Record<string, unknown> => ({
    ...buildBaseFields(body, {} as PengedaranInsert),
    ...("namaPengedaran" in body && { namaPengedaran: body.namaPengedaran as string }),
    ...("alamatPengedaran" in body && {
        alamatPengedaran: (body.alamatPengedaran as string) ?? null,
    }),
});

// ─── buildPenangkaranFields ───────────────────────────────────────────────────

export const buildPenangkaranFields = (body: Record<string, unknown>): Record<string, unknown> => ({
    ...buildBaseFields(body, {} as PenangkaranInsert),
    ...("namaPenangkaran" in body && { namaPenangkaran: body.namaPenangkaran as string }),
    ...("alamatPenangkaran" in body && {
        alamatPenangkaran: (body.alamatPenangkaran as string) ?? null,
    }),
});

// ─── buildLembagaFields ───────────────────────────────────────────────────────

export const buildLembagaFields = (body: Record<string, unknown>): Record<string, unknown> => ({
    ...buildBaseFields(body, {} as LembagaInsert),
    ...("namaLembaga" in body && { namaLembaga: body.namaLembaga as string }),
    ...("alamatLembaga" in body && {
        alamatLembaga: (body.alamatLembaga as string) ?? null,
    }),
});
