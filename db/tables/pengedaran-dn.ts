import { pgTable } from "drizzle-orm/pg-core";
import { basePengedaranColumns } from "./base-pengedaran";

export const pengedaranDalamNegeri = pgTable(
  "pengedaran_dalam_negeri",
  basePengedaranColumns
);