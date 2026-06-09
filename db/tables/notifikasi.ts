import { pgTable, serial, text, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { statusNotifikasiEnum, tabelTargetEnum } from "../enums/enum";
import { users } from "./users";

export const notifikasi = pgTable("notifikasi", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  status: statusNotifikasiEnum("status").notNull().default("unread"),
  tabelTarget: tabelTargetEnum("tabel_target").notNull(),
  targetId: integer("target_id").notNull(),
  nomorSk: text("nomor_sk"),
  tanggalKadaluarsa: timestamp("tanggal_kadaluarsa"),
  judul: text("judul").notNull(),
  pesan: text("pesan").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  targetUserUnique: unique("notifikasi_user_target_unique").on(
    table.userId,
    table.tabelTarget,
    table.targetId,
  ),
}));
