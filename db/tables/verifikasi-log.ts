import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { tabelTargetEnum, statusVerifikasiEnum, jenisPengajuanEnum } from "../enums/enum";
import { users } from "./users";

export const verifikasiLog = pgTable("verifikasi_log", {
  id: serial("id").primaryKey(),

  // Tabel mana yang diverifikasi
  tabelTarget: tabelTargetEnum("tabel_target").notNull(),

  // ID record di tabel target
  targetId: integer("target_id").notNull(),

  // Jenis pengajuan: tambah / perbarui / hapus
  jenisPengajuan: jenisPengajuanEnum("jenis_pengajuan").notNull(),

  // Status hasil verifikasi
  status: statusVerifikasiEnum("status").notNull(),

  // Catatan dari Admin Pusat (wajib diisi jika ditolak)
  catatan: text("catatan"),

  // Siapa yang mengajukan (Bidang Wilayah)
  diajukanOleh: integer("diajukan_oleh").references(() => users.id),
  
  // Admin Pusat yang melakukan verifikasi
  verifikasiOleh: integer("verifikasi_oleh").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),
});