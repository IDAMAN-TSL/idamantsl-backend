import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { statusVerifikasiEnum } from "../enums/enum";
import { wilayah } from "./wilayah";
import { referensiTsl } from "./referensi-tsl";
import { users } from "./users";

export const lembagaKonservasi = pgTable("lembaga_konservasi", {
  id: serial("id").primaryKey(),
  nomor: text("nomor"),
  namaLembaga: text("nama_lembaga").notNull(),

  nomorSk: text("nomor_sk"),
  tanggalSk: timestamp("tanggal_sk"),
  penerbit: text("penerbit"),
  akhirMasaBerlaku: timestamp("akhir_masa_berlaku"),

  namaDirektur: text("nama_direktur"),
  nomorTelepon: text("nomor_telepon"),

  bidangWilayahId: integer("bidang_wilayah_id").references(() => wilayah.id),
  seksiWilayahId: integer("seksi_wilayah_id").references(() => wilayah.id),

  alamatKantor: text("alamat_kantor"),
  alamatLembaga: text("alamat_lembaga"),
  koordinatLokasi: text("koordinat_lokasi"),

  tslId: integer("tsl_id").references(() => referensiTsl.id),

  statusVerifikasi: statusVerifikasiEnum("status_verifikasi").default("pending"),
  catatanVerifikasi: text("catatan_verifikasi"),

  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});