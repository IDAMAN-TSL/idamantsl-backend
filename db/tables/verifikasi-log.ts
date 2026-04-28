import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { tabelTargetEnum, statusVerifikasiEnum } from "../enums/enum";
import { users } from "./users";

export const verifikasiLog = pgTable("verifikasi_log", {
  id: serial("id").primaryKey(),

  // Tabel mana yang diverifikasi
  tabelTarget: tabelTargetEnum("tabel_target").notNull(),

  // ID record di tabel target
  targetId: integer("target_id").notNull(),

  // Status hasil verifikasi
  status: statusVerifikasiEnum("status").notNull(),

  // Catatan dari Admin Pusat (wajib diisi jika ditolak)
  catatan: text("catatan"),

  // Admin Pusat yang melakukan verifikasi
  verifikasiOleh: integer("verifikasi_oleh").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow(),
});