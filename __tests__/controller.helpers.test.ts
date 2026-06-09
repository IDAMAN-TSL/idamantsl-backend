import { Response } from "express";
import { AuthRequest } from "../src/middlewares/auth.middleware";
import {
  bulkDeleteHandler,
  validateWilayahMapping,
  handleError,
} from "../src/helpers/controller.helpers";

describe("controller.helpers.ts", () => {
  describe("bulkDeleteHandler", () => {
    it("should return 403 if user is not owner and not admin", async () => {
      const req = {
        user: { id: 1, role: "seksi_wilayah" },
        body: { ids: [10] },
      } as unknown as AuthRequest;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      // Mock findById to return an object created by someone else
      const mockFindById = jest.fn().mockResolvedValue({ id: 10, createdBy: 99 });

      await bulkDeleteHandler(req, res, {} as any, mockFindById, "TestData");

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Beberapa data bukan milik Anda",
      });
    });
  });

  describe("validateWilayahMapping", () => {
    it("should return error message if mapping is invalid", () => {
      // 1 (Bogor) mapped to 4, 5. So 99 is invalid.
      const result = validateWilayahMapping(1, 99);
      expect(result).toBe("Seksi wilayah yang dipilih tidak sesuai dengan bidang wilayah");
    });
  });

  describe("handleError", () => {
    let res: Response;
    
    beforeEach(() => {
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;
    });

    it("should handle 23505 with nama_daerah", () => {
      const dbError = { code: "23505", constraint: "nama_daerah_unique" };
      handleError(res, dbError, "TestContext");

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Nama daerah sudah terdaftar",
      });
    });

    it("should handle 23505 with nomor_sk", () => {
      const dbError = { code: "23505", detail: "nomor_sk already exists" };
      handleError(res, dbError, "TestContext");

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Nomor SK sudah terdaftar. Masukkan beberapa referensi TSL dalam satu data SK, bukan membuat nomor SK berulang.",
      });
    });

    it("should handle generic 23505 duplicate", () => {
      const dbError = { code: "23505", constraint: "other_unique" };
      handleError(res, dbError, "TestContext");

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Data duplikat tidak diperbolehkan",
      });
    });
  });
});
