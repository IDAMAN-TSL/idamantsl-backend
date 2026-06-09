import { pgTable, unique } from "drizzle-orm/pg-core";
import { basePengedaranColumns } from "./base-pengedaran";

export const pengedaranLuarNegeri = pgTable(
  "pengedaran_luar_negeri",
  basePengedaranColumns,
  (table) => ({
    nomorSkUnique: unique("pengedaran_ln_nomor_sk_unique").on(table.nomorSk),
  })
);
