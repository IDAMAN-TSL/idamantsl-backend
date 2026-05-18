/**
 * build-fields.test.ts
 *
 * Unit test untuk buildPengedaranFields & buildLembagaFields.
 * Ini pure functions, tidak butuh supertest/db mock.
 */

import { buildPengedaranFields, buildLembagaFields } from "../src/helpers/build-fields";

describe("buildPengedaranFields", () => {
    it("hanya memetakan field yang ada di body", () => {
        const result = buildPengedaranFields({ namaPengedaran: "Test DN" });
        expect(result).toEqual({ namaPengedaran: "Test DN" });
    });

    it("memetakan semua field standar", () => {
        const body = {
            nomor: "DN-001",
            namaPengedaran: "Test",
            nomorSk: "SK-001",
            tanggalSk: "2024-01-01",
            fileSk: "https://azure/file.pdf",
            penerbit: "BBKSDA Jabar",
            akhirMasaBerlaku: "2026-01-01",
            namaDirektur: "Budi",
            nomorTelepon: "08123",
            bidangWilayahId: 1,
            seksiWilayahId: 4,
            alamatKantor: "Jl. A",
            alamatPengedaran: "Jl. B",
            koordinatLokasi: "-6.0, 106.0",
            tslId: 2,
            statusPerlindunganNasional: "dilindungi",
            statusCites: "apendiks_i",
            statusIucn: "terancam_punah",
            jantan: 5,
            betina: 3,
        };

        const result = buildPengedaranFields(body);

        expect(result).toMatchObject({
            nomor: "DN-001",
            namaPengedaran: "Test",
            nomorSk: "SK-001",
            penerbit: "BBKSDA Jabar",
            namaDirektur: "Budi",
            nomorTelepon: "08123",
            bidangWilayahId: 1,
            seksiWilayahId: 4,
            alamatKantor: "Jl. A",
            alamatPengedaran: "Jl. B",
            koordinatLokasi: "-6.0, 106.0",
            tslId: 2,
            statusPerlindunganNasional: "dilindungi",
            statusCites: "apendiks_i",
            statusIucn: "terancam_punah",
            jantan: 5,
            betina: 3,
        });

        // field tanggal di-parse ke Date
        expect(result.tanggalSk).toBeInstanceOf(Date);
        expect(result.akhirMasaBerlaku).toBeInstanceOf(Date);
    });

    it("tanggalSk null ketika body berisi null", () => {
        const result = buildPengedaranFields({ tanggalSk: null });
        expect(result.tanggalSk).toBeNull();
    });

    it("akhirMasaBerlaku null ketika body berisi null", () => {
        const result = buildPengedaranFields({ akhirMasaBerlaku: null });
        expect(result.akhirMasaBerlaku).toBeNull();
    });

    it("bidangWilayahId null ketika body berisi nilai falsy", () => {
        const result = buildPengedaranFields({ bidangWilayahId: 0 });
        expect(result.bidangWilayahId).toBeNull();
    });

    it("seksiWilayahId null ketika body berisi nilai falsy", () => {
        const result = buildPengedaranFields({ seksiWilayahId: null });
        expect(result.seksiWilayahId).toBeNull();
    });

    it("tslId null ketika body berisi nilai falsy", () => {
        const result = buildPengedaranFields({ tslId: 0 });
        expect(result.tslId).toBeNull();
    });

    it("jantan null ketika body berisi null", () => {
        const result = buildPengedaranFields({ jantan: null });
        expect(result.jantan).toBeNull();
    });

    it("betina null ketika body berisi null", () => {
        const result = buildPengedaranFields({ betina: null });
        expect(result.betina).toBeNull();
    });

    it("tidak menyertakan field yang tidak ada di body", () => {
        const result = buildPengedaranFields({});
        expect(Object.keys(result)).toHaveLength(0);
    });

    it("nomor null ketika body berisi null", () => {
        const result = buildPengedaranFields({ nomor: null });
        expect(result.nomor).toBeNull();
    });
});

describe("buildLembagaFields", () => {
    it("hanya memetakan field yang ada di body", () => {
        const result = buildLembagaFields({ namaLembaga: "Kebun Binatang" });
        expect(result).toEqual({ namaLembaga: "Kebun Binatang" });
    });

    it("memetakan semua field standar lembaga", () => {
        const body = {
            nomor: "LK-001",
            namaLembaga: "Kebun Binatang Bandung",
            nomorSk: "SK-LK-001",
            tanggalSk: "2024-06-01",
            fileSk: "https://azure/lk.pdf",
            penerbit: "BBKSDA Jabar",
            akhirMasaBerlaku: "2027-01-01",
            namaDirektur: "Dewi",
            nomorTelepon: "02277889900",
            bidangWilayahId: 2,
            seksiWilayahId: 5,
            alamatKantor: "Jl. Tamansari No. 6",
            alamatLembaga: "Jl. Tamansari No. 6, Bandung",
            koordinatLokasi: "-6.9, 107.6",
            tslId: 3,
            statusPerlindunganNasional: "dilindungi",
            statusCites: "apendiks_ii",
            statusIucn: "risiko_rendah",
            jantan: 10,
            betina: 8,
        };

        const result = buildLembagaFields(body);

        expect(result).toMatchObject({
            nomor: "LK-001",
            namaLembaga: "Kebun Binatang Bandung",
            nomorSk: "SK-LK-001",
            penerbit: "BBKSDA Jabar",
            namaDirektur: "Dewi",
            nomorTelepon: "02277889900",
            bidangWilayahId: 2,
            seksiWilayahId: 5,
            alamatKantor: "Jl. Tamansari No. 6",
            alamatLembaga: "Jl. Tamansari No. 6, Bandung",
            koordinatLokasi: "-6.9, 107.6",
            tslId: 3,
            statusPerlindunganNasional: "dilindungi",
            statusCites: "apendiks_ii",
            statusIucn: "risiko_rendah",
            jantan: 10,
            betina: 8,
        });

        expect(result.tanggalSk).toBeInstanceOf(Date);
        expect(result.akhirMasaBerlaku).toBeInstanceOf(Date);
    });

    it("memetakan alamatLembaga (bukan alamatPengedaran)", () => {
        const result = buildLembagaFields({ alamatLembaga: "Jl. Lembaga No. 1" });
        expect(result).toHaveProperty("alamatLembaga", "Jl. Lembaga No. 1");
        expect(result).not.toHaveProperty("alamatPengedaran");
    });

    it("tanggalSk null ketika body berisi null", () => {
        const result = buildLembagaFields({ tanggalSk: null });
        expect(result.tanggalSk).toBeNull();
    });

    it("akhirMasaBerlaku null ketika body berisi null", () => {
        const result = buildLembagaFields({ akhirMasaBerlaku: null });
        expect(result.akhirMasaBerlaku).toBeNull();
    });

    it("bidangWilayahId null ketika body berisi nilai falsy", () => {
        const result = buildLembagaFields({ bidangWilayahId: 0 });
        expect(result.bidangWilayahId).toBeNull();
    });

    it("tslId null ketika body berisi nilai falsy", () => {
        const result = buildLembagaFields({ tslId: null });
        expect(result.tslId).toBeNull();
    });

    it("jantan null ketika body berisi null", () => {
        const result = buildLembagaFields({ jantan: null });
        expect(result.jantan).toBeNull();
    });

    it("betina null ketika body berisi null", () => {
        const result = buildLembagaFields({ betina: null });
        expect(result.betina).toBeNull();
    });

    it("tidak menyertakan field yang tidak ada di body", () => {
        const result = buildLembagaFields({});
        expect(Object.keys(result)).toHaveLength(0);
    });
});
