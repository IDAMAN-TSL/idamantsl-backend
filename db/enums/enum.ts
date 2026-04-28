import { pgEnum } from "drizzle-orm/pg-core";

// 3 Role pengguna sistem
export const roleEnum = pgEnum("role", [
  "admin_pusat",    // BBKSDA Jawa Barat - akses penuh
  "bidang_wilayah", // Bidang I/II/III - CRUD + perlu verifikasi
  "seksi_wilayah",  // Seksi I-VI - hanya READ
]);

// Jenis TSL
export const jenisTslEnum = pgEnum("jenis_tsl", [
  "tumbuhan",
  "satwa_liar",
]);

// Status verifikasi data oleh Admin Pusat
export const statusVerifikasiEnum = pgEnum("status_verifikasi", [
  "pending",   // Baru diinput oleh Bidang Wilayah
  "disetujui", // Sudah diverifikasi Admin Pusat
  "ditolak",   // Ditolak Admin Pusat (ada catatan)
]);

// Tipe tabel target untuk log verifikasi
export const tabelTargetEnum = pgEnum("tabel_target", [
  "penangkaran",
  "pengedaran_dalam_negeri",
  "pengedaran_luar_negeri",
  "lembaga_konservasi",
  "referensi_tsl",
]);

// Tipe wilayah
export const tipeWilayahEnum = pgEnum("tipe_wilayah", [
  "bidang", // Bidang Wilayah I, II, III
  "seksi",  // Seksi Wilayah I, II, III, IV, V, VI
]);