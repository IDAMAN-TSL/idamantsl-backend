import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { statusVerifikasiEnum } from "../enums/enum";
import { wilayah } from "./wilayah";
import { referensiTsl } from "./referensi-tsl";
import { users } from "./users";

export const penangkaran = pgTable("penangkaran", {
  id: serial("id").primaryKey(),
  nomor: text("nomor"),

  // Nama unit penangkaran
  // contoh: "Perum Perhutani Divisi Regional Jawa Barat dan Banten"
  namaPenangkaran: text("nama_penangkaran").notNull(),

  // Surat izin
  nomorSk: text("nomor_sk"),           // contoh: "SK.1010/KSDAE/SET.3/..."
  tanggalSk: timestamp("tanggal_sk"),  // tanggal terbit SK
  penerbit: text("penerbit"),          // contoh: "Direjen KSDAE", "BKPM"
  akhirMasaBerlaku: timestamp("akhir_masa_berlaku"),

  // Penanggung jawab
  namaDirektur: text("nama_direktur"),
  nomorTelepon: text("nomor_telepon"), // bisa telepon/fax/HP

  // Relasi wilayah
  // Bidang Wilayah: I (Bogor), II (Soreang), III (Ciamis)
  bidangWilayahId: integer("bidang_wilayah_id").references(() => wilayah.id),
  // Seksi Wilayah: I (Serang), II (Bogor), III (Soreang), IV (Purwakarta), V (Garut), VI (Tasikmalaya)
  seksiWilayahId: integer("seksi_wilayah_id").references(() => wilayah.id),

  // Lokasi
  alamatKantor: text("alamat_kantor"),
  alamatPenangkaran: text("alamat_penangkaran"),
  koordinatLokasi: text("koordinat_lokasi"), // disimpan sebagai text karena format bervariasi

  // Relasi ke referensi TSL
  tslId: integer("tsl_id").references(() => referensiTsl.id),

  // Status verifikasi oleh Admin Pusat
  statusVerifikasi: statusVerifikasiEnum("status_verifikasi").default("pending"),
  catatanVerifikasi: text("catatan_verifikasi"),

  // Siapa yang menginput (Bidang Wilayah atau Admin Pusat)
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});