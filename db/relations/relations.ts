import { relations } from "drizzle-orm";
import { wilayah } from "../tables/wilayah";
import { users } from "../tables/users";
import { referensiTsl } from "../tables/referensi-tsl";
import { penangkaran } from "../tables/penangkaran";
import { pengedaranDalamNegeri } from "../tables/pengedaran-dn";
import { pengedaranLuarNegeri } from "../tables/pengedaran-ln";
import { lembagaKonservasi } from "../tables/lembaga-konservasi";
import { verifikasiLog } from "../tables/verifikasi-log";

// =============================================
// RELASI: wilayah
// wilayah → memiliki banyak users, penangkaran, dst
// =============================================

export const wilayahRelations = relations(wilayah, ({ many }) => ({
  users: many(users),
  penangkaranBidang: many(penangkaran, { relationName: "bidangWilayah" }),
  penangkaranSeksi: many(penangkaran, { relationName: "seksiWilayah" }),
  pengedaranDnBidang: many(pengedaranDalamNegeri, { relationName: "bidangWilayahDn" }),
  pengedaranDnSeksi: many(pengedaranDalamNegeri, { relationName: "seksiWilayahDn" }),
  pengedaranLnBidang: many(pengedaranLuarNegeri, { relationName: "bidangWilayahLn" }),
  pengedaranLnSeksi: many(pengedaranLuarNegeri, { relationName: "seksiWilayahLn" }),
  lembagaBidang: many(lembagaKonservasi, { relationName: "bidangWilayahLk" }),
  lembagaSeksi: many(lembagaKonservasi, { relationName: "seksiWilayahLk" }),
}));

// =============================================
// RELASI: users
// users → terikat ke 1 wilayah, bisa input banyak data
// =============================================

export const usersRelations = relations(users, ({ one, many }) => ({
  wilayah: one(wilayah, {
    fields: [users.wilayahId],
    references: [wilayah.id],
  }),
  penangkaranDibuat: many(penangkaran, { relationName: "createdByUserPk" }),
  pengedaranDnDibuat: many(pengedaranDalamNegeri, { relationName: "createdByUserDn" }),
  pengedaranLnDibuat: many(pengedaranLuarNegeri, { relationName: "createdByUserLn" }),
  lembagaDibuat: many(lembagaKonservasi, { relationName: "createdByUserLk" }),
  verifikasiDilakukan: many(verifikasiLog),
}));

// =============================================
// RELASI: referensiTsl
// referensiTsl → bisa direferensikan oleh banyak tabel
// =============================================

export const referensiTslRelations = relations(referensiTsl, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [referensiTsl.createdBy],
    references: [users.id],
  }),
  penangkaran: many(penangkaran),
  pengedaranDalamNegeri: many(pengedaranDalamNegeri),
  pengedaranLuarNegeri: many(pengedaranLuarNegeri),
  lembagaKonservasi: many(lembagaKonservasi),
}));

// =============================================
// RELASI: penangkaran
// =============================================

export const penangkaranRelations = relations(penangkaran, ({ one }) => ({
  bidangWilayah: one(wilayah, {
    fields: [penangkaran.bidangWilayahId],
    references: [wilayah.id],
    relationName: "bidangWilayah",
  }),
  seksiWilayah: one(wilayah, {
    fields: [penangkaran.seksiWilayahId],
    references: [wilayah.id],
    relationName: "seksiWilayah",
  }),
  tsl: one(referensiTsl, {
    fields: [penangkaran.tslId],
    references: [referensiTsl.id],
  }),
  createdBy: one(users, {
    fields: [penangkaran.createdBy],
    references: [users.id],
    relationName: "createdByUserPk",
  }),
  updatedBy: one(users, {
    fields: [penangkaran.updatedBy],
    references: [users.id],
    relationName: "updatedByUserPk",
  }),
}));

// =============================================
// RELASI: pengedaranDalamNegeri
// =============================================

export const pengedaranDalamNegeriRelations = relations(pengedaranDalamNegeri, ({ one }) => ({
  bidangWilayah: one(wilayah, {
    fields: [pengedaranDalamNegeri.bidangWilayahId],
    references: [wilayah.id],
    relationName: "bidangWilayahDn",
  }),
  seksiWilayah: one(wilayah, {
    fields: [pengedaranDalamNegeri.seksiWilayahId],
    references: [wilayah.id],
    relationName: "seksiWilayahDn",
  }),
  tsl: one(referensiTsl, {
    fields: [pengedaranDalamNegeri.tslId],
    references: [referensiTsl.id],
  }),
  createdBy: one(users, {
    fields: [pengedaranDalamNegeri.createdBy],
    references: [users.id],
    relationName: "createdByUserDn",
  }),
  updatedBy: one(users, {
    fields: [pengedaranDalamNegeri.updatedBy],
    references: [users.id],
    relationName: "updatedByUserDn",
  }),
}));

// =============================================
// RELASI: pengedaranLuarNegeri
// =============================================

export const pengedaranLuarNegeriRelations = relations(pengedaranLuarNegeri, ({ one }) => ({
  bidangWilayah: one(wilayah, {
    fields: [pengedaranLuarNegeri.bidangWilayahId],
    references: [wilayah.id],
    relationName: "bidangWilayahLn",
  }),
  seksiWilayah: one(wilayah, {
    fields: [pengedaranLuarNegeri.seksiWilayahId],
    references: [wilayah.id],
    relationName: "seksiWilayahLn",
  }),
  tsl: one(referensiTsl, {
    fields: [pengedaranLuarNegeri.tslId],
    references: [referensiTsl.id],
  }),
  createdBy: one(users, {
    fields: [pengedaranLuarNegeri.createdBy],
    references: [users.id],
    relationName: "createdByUserLn",
  }),
  updatedBy: one(users, {
    fields: [pengedaranLuarNegeri.updatedBy],
    references: [users.id],
    relationName: "updatedByUserLn",
  }),
}));

// =============================================
// RELASI: lembagaKonservasi
// =============================================

export const lembagaKonservasiRelations = relations(lembagaKonservasi, ({ one }) => ({
  bidangWilayah: one(wilayah, {
    fields: [lembagaKonservasi.bidangWilayahId],
    references: [wilayah.id],
    relationName: "bidangWilayahLk",
  }),
  seksiWilayah: one(wilayah, {
    fields: [lembagaKonservasi.seksiWilayahId],
    references: [wilayah.id],
    relationName: "seksiWilayahLk",
  }),
  tsl: one(referensiTsl, {
    fields: [lembagaKonservasi.tslId],
    references: [referensiTsl.id],
  }),
  createdBy: one(users, {
    fields: [lembagaKonservasi.createdBy],
    references: [users.id],
    relationName: "createdByUserLk",
  }),
  updatedBy: one(users, {
    fields: [lembagaKonservasi.updatedBy],
    references: [users.id],
    relationName: "updatedByUserLk",
  }),
}));

// =============================================
// RELASI: verifikasiLog
// verifikasiLog → siapa yang verifikasi data mana
// =============================================

export const verifikasiLogRelations = relations(verifikasiLog, ({ one }) => ({
  verifikasiOleh: one(users, {
    fields: [verifikasiLog.verifikasiOleh],
    references: [users.id],
  }),
}));