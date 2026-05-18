import { serial, text, timestamp, integer, json } from "drizzle-orm/pg-core";
import {
  statusVerifikasiEnum,
  statusCitesEnum,
  statusPerlindunganNasionalEnum,
  statusIucnEnum,
} from "../enums/enum";
import { wilayah } from "./wilayah";
import { referensiTsl } from "./referensi-tsl";
import { users } from "./users";

// Kolom dasar yang dipakai oleh pengedaran-dn & pengedaran-ln.
// Identik dengan penangkaran kecuali nama kolom alamat & nama entitas.

export const basePengedaranColumns = {
  id: serial("id").primaryKey(),
  nomor: text("nomor"),
  namaPengedaran: text("nama_pengedaran").notNull(),

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
  alamatPengedaran: text("alamat_pengedaran"),
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
};
