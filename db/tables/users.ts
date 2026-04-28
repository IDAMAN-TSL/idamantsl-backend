import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { roleEnum } from "../enums/enum";
import { wilayah } from "./wilayah";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), 
  nomorTelepon: text("nomor_telepon"),

  // Role menentukan hak akses di sistem
  role: roleEnum("role").notNull(),

  // Relasi ke wilayah:
  // - admin_pusat    → NULL (tidak terikat wilayah)
  // - bidang_wilayah → id wilayah tipe "bidang"
  // - seksi_wilayah  → id wilayah tipe "seksi"
  wilayahId: integer("wilayah_id").references(() => wilayah.id),

  // Untuk fitur forgot password (FR-1.2)
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});