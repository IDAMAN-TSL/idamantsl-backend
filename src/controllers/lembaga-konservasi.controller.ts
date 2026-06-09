import { lembagaKonservasi } from "../../db/schema";
import { createModuleController } from "../helpers/module.factory";
import { buildLembagaFields } from "../helpers/build-fields";

const ctrl = createModuleController({
    table: lembagaKonservasi,
    entityName: "lembaga konservasi",
    queryKey: "lembagaKonservasi",
    namaFieldKey: "namaLembaga",
    buildFields: buildLembagaFields,
});

export const getAllLembagaKonservasi = ctrl.getAll;
export const getLembagaKonservasiById = ctrl.getById;
export const createLembagaKonservasi = ctrl.create;
export const updateLembagaKonservasi = ctrl.update;
export const deleteLembagaKonservasi = ctrl.remove;
export const bulkDeleteLembagaKonservasi = ctrl.bulkDelete;
