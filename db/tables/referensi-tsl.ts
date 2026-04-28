import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { jenisTslEnum, statusVerifikasiEnum } from "../enums/enum";
import { users } from "./users";

export const referensiTsl = pgTable("referensi_tsl", {
  id: serial("id").primaryKey(),
  nomor: text("nomor"),

  namaDaerah: text("nama_daerah").notNull(),

  jenis: jenisTslEnum("jenis").notNull(),

  kingdom: text("kingdom"), 
  divisi: text("divisi"),   
  kelas: text("kelas"),     
  ordo: text("ordo"),       
  famili: text("famili"),  
  genus: text("genus"),    
  spesies: text("spesies"), 

  statusPerlindunganNasional: text("status_perlindungan_nasional"), 

  statusVerifikasi: statusVerifikasiEnum("status_verifikasi").default("pending"),
  catatanVerifikasi: text("catatan_verifikasi"),

  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});