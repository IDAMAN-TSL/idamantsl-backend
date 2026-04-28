import { pgTable } from "drizzle-orm/pg-core";
import { basePengedaranColumns } from "./base-pengedaran";

export const pengedaranLuarNegeri = pgTable(
  "pengedaran_luar_negeri",
  basePengedaranColumns
);