import { checkReferensiDependencies } from "../src/helpers/referensi-deps";
import { db } from "../db/index";

jest.mock("../db/index", () => ({
    db: { select: jest.fn() },
}));

const mockDb = db as jest.Mocked<typeof db>;

function mockDepCheck(pk: unknown[], dn: unknown[], ln: unknown[], lk: unknown[]) {
    const chain = (result: unknown[]) => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(result),
    });
    (mockDb.select as jest.Mock)
        .mockReturnValueOnce(chain(pk))
        .mockReturnValueOnce(chain(dn))
        .mockReturnValueOnce(chain(ln))
        .mockReturnValueOnce(chain(lk));
}

describe("checkReferensiDependencies", () => {
    beforeEach(() => jest.resetAllMocks());

    it("return null kalau tidak ada dependensi", async () => {
        mockDepCheck([], [], [], []);
        const result = await checkReferensiDependencies(1);
        expect(result).toBeNull();
    });

    it("return ['Penangkaran'] kalau ada di penangkaran", async () => {
        mockDepCheck([{ id: 1 }], [], [], []);
        const result = await checkReferensiDependencies(1);
        expect(result).toEqual(["Penangkaran"]);
    });

    it("return ['Pengedaran Dalam Negeri'] kalau ada di pengedaran DN", async () => {
        mockDepCheck([], [{ id: 2 }], [], []);
        const result = await checkReferensiDependencies(1);
        expect(result).toEqual(["Pengedaran Dalam Negeri"]);
    });

    it("return ['Pengedaran Luar Negeri'] kalau ada di pengedaran LN", async () => {
        mockDepCheck([], [], [{ id: 3 }], []);
        const result = await checkReferensiDependencies(1);
        expect(result).toEqual(["Pengedaran Luar Negeri"]);
    });

    it("return ['Lembaga Konservasi'] kalau ada di lembaga konservasi", async () => {
        mockDepCheck([], [], [], [{ id: 4 }]);
        const result = await checkReferensiDependencies(1);
        expect(result).toEqual(["Lembaga Konservasi"]);
    });

    it("return semua tabel kalau direferensikan di semua", async () => {
        mockDepCheck([{ id: 1 }], [{ id: 2 }], [{ id: 3 }], [{ id: 4 }]);
        const result = await checkReferensiDependencies(1);
        expect(result).toEqual([
            "Penangkaran",
            "Pengedaran Dalam Negeri",
            "Pengedaran Luar Negeri",
            "Lembaga Konservasi",
        ]);
    });

    it("return kombinasi parsial", async () => {
        mockDepCheck([{ id: 1 }], [], [{ id: 3 }], []);
        const result = await checkReferensiDependencies(1);
        expect(result).toEqual(["Penangkaran", "Pengedaran Luar Negeri"]);
    });
});
