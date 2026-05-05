import { pgTable, serial, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import {
  jenisTslEnum,
  statusVerifikasiEnum,
  statusCitesEnum,
  statusIucnEnum,
  statusPerlindunganNasionalEnum,
} from "../enums/enum";
import { users } from "./users";

export const referensiTsl = pgTable("referensi_tsl", {
  id: serial("id").primaryKey(),
  nomor: text("nomor"),
  namaDaerah: text("nama_daerah").notNull(),
  jenis: jenisTslEnum("jenis").notNull(),

  // Klasifikasi taksonomi
  kingdom: text("kingdom"),
  divisi: text("divisi"),
  kelas: text("kelas"),
  ordo: text("ordo"),
  famili: text("famili"),
  genus: text("genus"),
  spesies: text("spesies"),

  // Status perlindungan
  statusPerlindunganNasional: statusPerlindunganNasionalEnum(
    "status_perlindungan_nasional"
  ),
  statusCites: statusCitesEnum("status_cites"),
  statusIucn: statusIucnEnum("status_iucn"),

  // Verifikasi
  statusVerifikasi: statusVerifikasiEnum("status_verifikasi").default("pending"),
  catatanVerifikasi: text("catatan_verifikasi"),

  // Draft perubahan dari bidang_wilayah (menunggu persetujuan admin)
  pendingChanges: jsonb("pending_changes"),

  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});