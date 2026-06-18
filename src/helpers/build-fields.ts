/**
 * build-fields.ts
/**
 * build-fields.ts
 *
 * Fungsi pembangun objek fields dari request body untuk tiap modul.
 * Hanya menyertakan field yang ada di body (partial update safe).
 */

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
        try { 
            parsedTslItems = JSON.parse(body.tslItems); 
        } catch (e) {
            console.error("Gagal melakukan parse tslItems JSON:", e);
        }
    }
    const rawItems = Array.isArray(parsedTslItems) ? parsedTslItems as TslItemInput[] : [];

    let tslItems: Array<Record<string, unknown>> = [];
    if (rawItems.length > 0) {
        tslItems = rawItems.map((item) => ({
            tslId: Number(item.tslId),
            statusPerlindunganNasional: item.statusPerlindunganNasional ?? null,
            statusCites: item.statusCites ?? null,
            statusIucn: item.statusIucn ?? null,
            jantan: toNullableNumber(item.jantan),
            betina: toNullableNumber(item.betina),
        }));
    } else if (hasTslId && body.tslId) {
        tslItems = [{
            tslId: Number(body.tslId),
            statusPerlindunganNasional: body.statusPerlindunganNasional ?? null,
            statusCites: body.statusCites ?? null,
            statusIucn: body.statusIucn ?? null,
            jantan: toNullableNumber(body.jantan),
            betina: toNullableNumber(body.betina),
        }];
    }

    const hasValidItems = hasJumlahTsl || hasTslItems || tslItems.length > 0;
    return {
        ...(hasValidItems ? { jumlahTsl, tslItems } : {}),
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

function buildBaseFields(body: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const simpleStringFields = [
        "nomor", "nomorSk", "fileSk", "penerbit", "namaDirektur", 
        "nomorTelepon", "alamatKantor", "koordinatLokasi", 
        "statusPerlindunganNasional", "statusCites", "statusIucn"
    ];

    for (const field of simpleStringFields) {
        if (field in body) {
            result[field] = body[field] ?? null;
        }
    }

    if ("tanggalSk" in body) result.tanggalSk = body.tanggalSk ? new Date(body.tanggalSk as string) : null;
    if ("akhirMasaBerlaku" in body) result.akhirMasaBerlaku = body.akhirMasaBerlaku ? new Date(body.akhirMasaBerlaku as string) : null;
    if ("bidangWilayahId" in body) result.bidangWilayahId = body.bidangWilayahId ? Number(body.bidangWilayahId) : null;
    if ("seksiWilayahId" in body) result.seksiWilayahId = body.seksiWilayahId ? Number(body.seksiWilayahId) : null;
    if ("jantan" in body) result.jantan = toNullableNumber(body.jantan);
    if ("betina" in body) result.betina = toNullableNumber(body.betina);

    return { ...result, ...normalizeTslFields(body) };
}

// ─── buildPengedaranFields (pengedaran-dn & pengedaran-ln) ───────────────────

export const buildPengedaranFields = (body: Record<string, unknown>): Record<string, unknown> => {
    const result = buildBaseFields(body);
    if ("namaPengedaran" in body) result.namaPengedaran = body.namaPengedaran;
    if ("alamatPengedaran" in body) result.alamatPengedaran = body.alamatPengedaran ?? null;
    return result;
};

// ─── buildPenangkaranFields ───────────────────────────────────────────────────

export const buildPenangkaranFields = (body: Record<string, unknown>): Record<string, unknown> => {
    const result = buildBaseFields(body);
    if ("namaPenangkaran" in body) result.namaPenangkaran = body.namaPenangkaran;
    if ("alamatPenangkaran" in body) result.alamatPenangkaran = body.alamatPenangkaran ?? null;
    return result;
};

// ─── buildLembagaFields ───────────────────────────────────────────────────────

export const buildLembagaFields = (body: Record<string, unknown>): Record<string, unknown> => {
    const result = buildBaseFields(body);
    if ("namaLembaga" in body) result.namaLembaga = body.namaLembaga;
    if ("alamatLembaga" in body) result.alamatLembaga = body.alamatLembaga ?? null;
    return result;
};
