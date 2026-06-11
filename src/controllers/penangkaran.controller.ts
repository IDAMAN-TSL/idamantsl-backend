import { penangkaran } from "../../db/schema";
import { createModuleController } from "../helpers/module.factory";
import { buildPenangkaranFields } from "../helpers/build-fields";

const ctrl = createModuleController({
    table: penangkaran,
    entityName: "penangkaran",
    queryKey: "penangkaran",
    namaFieldKey: "namaPenangkaran",
    buildFields: buildPenangkaranFields,
});

export const getAllPenangkaran = ctrl.getAll;
export const getPenangkaranById = ctrl.getById;
export const createPenangkaran = ctrl.create;
export const updatePenangkaran = ctrl.update;
export const deletePenangkaran = ctrl.remove;
export const bulkDeletePenangkaran = ctrl.bulkDelete;