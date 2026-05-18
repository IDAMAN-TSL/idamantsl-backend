import { pengedaranLuarNegeri } from "../../db/schema";
import { createModuleController } from "../helpers/module.factory";
import { buildPengedaranFields } from "../helpers/build-fields";

const ctrl = createModuleController({
    table: pengedaranLuarNegeri,
    entityName: "pengedaran luar negeri",
    queryKey: "pengedaranLuarNegeri",
    namaFieldKey: "namaPengedaran",
    buildFields: buildPengedaranFields,
});

export const getAllPengedaranLn = ctrl.getAll;
export const getPengedaranLnById = ctrl.getById;
export const createPengedaranLn = ctrl.create;
export const updatePengedaranLn = ctrl.update;
export const deletePengedaranLn = ctrl.remove;
export const bulkDeletePengedaranLn = ctrl.bulkDelete;
