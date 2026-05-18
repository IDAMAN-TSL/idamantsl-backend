import { pengedaranDalamNegeri } from "../../db/schema";
import { createModuleController } from "../helpers/module.factory";
import { buildPengedaranFields } from "../helpers/build-fields";

const ctrl = createModuleController({
    table: pengedaranDalamNegeri,
    entityName: "pengedaran dalam negeri",
    queryKey: "pengedaranDalamNegeri",
    namaFieldKey: "namaPengedaran",
    buildFields: buildPengedaranFields,
});

export const getAllPengedaranDn = ctrl.getAll;
export const getPengedaranDnById = ctrl.getById;
export const createPengedaranDn = ctrl.create;
export const updatePengedaranDn = ctrl.update;
export const deletePengedaranDn = ctrl.remove;
export const bulkDeletePengedaranDn = ctrl.bulkDelete;
