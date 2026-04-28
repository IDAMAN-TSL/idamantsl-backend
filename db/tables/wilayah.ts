import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { tipeWilayahEnum } from "../enums/enum";

export const wilayah = pgTable("wilayah", {
  id: serial("id").primaryKey(),

  nomorWilayah: text("nomor_wilayah").notNull(),

  namaWilayah: text("nama_wilayah").notNull(),

  alamatWilayah: text("alamat_wilayah"),

  tipeWilayah: tipeWilayahEnum("tipe_wilayah").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});