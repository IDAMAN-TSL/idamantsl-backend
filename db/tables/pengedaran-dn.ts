import { pgTable, unique } from "drizzle-orm/pg-core";
import { basePengedaranColumns } from "./base-pengedaran";

export const pengedaranDalamNegeri = pgTable(
  "pengedaran_dalam_negeri",
  basePengedaranColumns,
  (table) => ({
    nomorSkUnique: unique("pengedaran_dn_nomor_sk_unique").on(table.nomorSk),
  })
);
