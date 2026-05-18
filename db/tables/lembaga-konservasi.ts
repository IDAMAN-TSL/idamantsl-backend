import { pgTable, serial, text, timestamp, integer, json } from "drizzle-orm/pg-core";
import {
  statusVerifikasiEnum,
  statusCitesEnum,
  statusPerlindunganNasionalEnum,
  statusIucnEnum,
} from "../enums/enum";
import { wilayah } from "./wilayah";
import { referensiTsl } from "./referensi-tsl";
import { users } from "./users";

export const lembagaKonservasi = pgTable("lembaga_konservasi", {
  id: serial("id").primaryKey(),
  nomor: text("nomor"),
  namaLembaga: text("nama_lembaga").notNull(),

  // Surat izin
  nomorSk: text("nomor_sk"),
  tanggalSk: timestamp("tanggal_sk"),
  fileSk: text("file_sk"),
  penerbit: text("penerbit"),
  akhirMasaBerlaku: timestamp("akhir_masa_berlaku"),

  // Penanggung jawab
  namaDirektur: text("nama_direktur"),
  nomorTelepon: text("nomor_telepon"),

  // Relasi wilayah
  bidangWilayahId: integer("bidang_wilayah_id").references(() => wilayah.id),
  seksiWilayahId: integer("seksi_wilayah_id").references(() => wilayah.id),

  // Lokasi
  alamatKantor: text("alamat_kantor"),
  alamatLembaga: text("alamat_lembaga"),
  koordinatLokasi: text("koordinat_lokasi"),

  // Relasi ke referensi TSL
  tslId: integer("tsl_id").references(() => referensiTsl.id),

  // Status perlindungan
  statusPerlindunganNasional: statusPerlindunganNasionalEnum("status_perlindungan_nasional"),
  statusCites: statusCitesEnum("status_cites"),
  statusIucn: statusIucnEnum("status_iucn"),

  // Jumlah individu
  jantan: integer("jantan"),
  betina: integer("betina"),

  // Status verifikasi
  statusVerifikasi: statusVerifikasiEnum("status_verifikasi").default("pending"),
  catatanVerifikasi: text("catatan_verifikasi"),
  pendingChanges: json("pending_changes"),

  // Audit
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
