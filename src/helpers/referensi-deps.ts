/**
 * referensi-deps.ts
 *
 * Cek apakah referensi TSL masih direferensikan oleh tabel lain.
 * Dipakai oleh referensi-tsl.controller.ts dan verifikasi.controller.ts.
 */

import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
    penangkaran,
    pengedaranDalamNegeri,
    pengedaranLuarNegeri,
    lembagaKonservasi,
} from "../../db/schema";

export async function checkReferensiDependencies(
    tslId: number
): Promise<string[] | null> {
    const [pk, dn, ln, lk] = await Promise.all([
        db.select({ id: penangkaran.id }).from(penangkaran).where(eq(penangkaran.tslId, tslId)).limit(1),
        db.select({ id: pengedaranDalamNegeri.id }).from(pengedaranDalamNegeri).where(eq(pengedaranDalamNegeri.tslId, tslId)).limit(1),
        db.select({ id: pengedaranLuarNegeri.id }).from(pengedaranLuarNegeri).where(eq(pengedaranLuarNegeri.tslId, tslId)).limit(1),
        db.select({ id: lembagaKonservasi.id }).from(lembagaKonservasi).where(eq(lembagaKonservasi.tslId, tslId)).limit(1),
    ]);

    const deps: string[] = [];
    if (pk.length > 0) deps.push("Penangkaran");
    if (dn.length > 0) deps.push("Pengedaran Dalam Negeri");
    if (ln.length > 0) deps.push("Pengedaran Luar Negeri");
    if (lk.length > 0) deps.push("Lembaga Konservasi");

    return deps.length > 0 ? deps : null;
}
