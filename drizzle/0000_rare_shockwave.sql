CREATE TYPE "public"."jenis_pengajuan" AS ENUM('tambah', 'perbarui', 'hapus');--> statement-breakpoint
CREATE TYPE "public"."jenis_tsl" AS ENUM('tumbuhan', 'satwa_liar');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin_pusat', 'bidang_wilayah', 'seksi_wilayah');--> statement-breakpoint
CREATE TYPE "public"."status_cites" AS ENUM('apendiks_i', 'apendiks_ii', 'apendiks_iii');--> statement-breakpoint
CREATE TYPE "public"."status_iucn" AS ENUM('tidak_dievaluasi', 'data_tidak_cukup', 'risiko_rendah', 'hampir_terancam', 'rentan', 'terancam_punah', 'sangat_terancam_punah', 'punah_di_alam', 'punah');--> statement-breakpoint
CREATE TYPE "public"."status_perlindungan_nasional" AS ENUM('tidak_dilindungi', 'dilindungi');--> statement-breakpoint
CREATE TYPE "public"."status_verifikasi" AS ENUM('pending', 'disetujui', 'ditolak');--> statement-breakpoint
CREATE TYPE "public"."tabel_target" AS ENUM('penangkaran', 'pengedaran_dalam_negeri', 'pengedaran_luar_negeri', 'lembaga_konservasi', 'referensi_tsl');--> statement-breakpoint
CREATE TYPE "public"."tipe_wilayah" AS ENUM('bidang', 'seksi');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"nomor_telepon" text,
	"alamat_kantor" text,
	"role" "role" NOT NULL,
	"wilayah_id" integer,
	"reset_token" text,
	"reset_token_expiry" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wilayah" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor_wilayah" text NOT NULL,
	"nama_wilayah" text NOT NULL,
	"alamat_wilayah" text,
	"tipe_wilayah" "tipe_wilayah" NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referensi_tsl" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text,
	"nama_daerah" text NOT NULL,
	"jenis" "jenis_tsl" NOT NULL,
	"kingdom" text,
	"divisi" text,
	"kelas" text,
	"ordo" text,
	"famili" text,
	"genus" text,
	"spesies" text,
	"status_perlindungan_nasional" "status_perlindungan_nasional",
	"status_cites" "status_cites",
	"status_iucn" "status_iucn",
	"status_verifikasi" "status_verifikasi" DEFAULT 'pending',
	"catatan_verifikasi" text,
	"pending_changes" jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "penangkaran" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text,
	"nama_penangkaran" text NOT NULL,
	"nomor_sk" text,
	"tanggal_sk" timestamp,
	"penerbit" text,
	"akhir_masa_berlaku" timestamp,
	"nama_direktur" text,
	"nomor_telepon" text,
	"bidang_wilayah_id" integer,
	"seksi_wilayah_id" integer,
	"alamat_kantor" text,
	"alamat_penangkaran" text,
	"koordinat_lokasi" text,
	"tsl_id" integer,
	"status_verifikasi" "status_verifikasi" DEFAULT 'pending',
	"catatan_verifikasi" text,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pengedaran_dalam_negeri" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text,
	"nama_pengedaran" text NOT NULL,
	"nomor_sk" text,
	"tanggal_sk" timestamp,
	"penerbit" text,
	"akhir_masa_berlaku" timestamp,
	"nama_direktur" text,
	"nomor_telepon" text,
	"bidang_wilayah_id" integer,
	"seksi_wilayah_id" integer,
	"alamat_kantor" text,
	"alamat_pengedaran" text,
	"koordinat_lokasi" text,
	"tsl_id" integer,
	"status_verifikasi" "status_verifikasi" DEFAULT 'pending',
	"catatan_verifikasi" text,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pengedaran_luar_negeri" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text,
	"nama_pengedaran" text NOT NULL,
	"nomor_sk" text,
	"tanggal_sk" timestamp,
	"penerbit" text,
	"akhir_masa_berlaku" timestamp,
	"nama_direktur" text,
	"nomor_telepon" text,
	"bidang_wilayah_id" integer,
	"seksi_wilayah_id" integer,
	"alamat_kantor" text,
	"alamat_pengedaran" text,
	"koordinat_lokasi" text,
	"tsl_id" integer,
	"status_verifikasi" "status_verifikasi" DEFAULT 'pending',
	"catatan_verifikasi" text,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lembaga_konservasi" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor" text,
	"nama_lembaga" text NOT NULL,
	"nomor_sk" text,
	"tanggal_sk" timestamp,
	"penerbit" text,
	"akhir_masa_berlaku" timestamp,
	"nama_direktur" text,
	"nomor_telepon" text,
	"bidang_wilayah_id" integer,
	"seksi_wilayah_id" integer,
	"alamat_kantor" text,
	"alamat_lembaga" text,
	"koordinat_lokasi" text,
	"tsl_id" integer,
	"status_verifikasi" "status_verifikasi" DEFAULT 'pending',
	"catatan_verifikasi" text,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verifikasi_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"tabel_target" "tabel_target" NOT NULL,
	"target_id" integer NOT NULL,
	"jenis_pengajuan" "jenis_pengajuan" NOT NULL,
	"status" "status_verifikasi" NOT NULL,
	"catatan" text,
	"diajukan_oleh" integer,
	"verifikasi_oleh" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_wilayah_id_wilayah_id_fk" FOREIGN KEY ("wilayah_id") REFERENCES "public"."wilayah"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referensi_tsl" ADD CONSTRAINT "referensi_tsl_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penangkaran" ADD CONSTRAINT "penangkaran_bidang_wilayah_id_wilayah_id_fk" FOREIGN KEY ("bidang_wilayah_id") REFERENCES "public"."wilayah"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penangkaran" ADD CONSTRAINT "penangkaran_seksi_wilayah_id_wilayah_id_fk" FOREIGN KEY ("seksi_wilayah_id") REFERENCES "public"."wilayah"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penangkaran" ADD CONSTRAINT "penangkaran_tsl_id_referensi_tsl_id_fk" FOREIGN KEY ("tsl_id") REFERENCES "public"."referensi_tsl"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penangkaran" ADD CONSTRAINT "penangkaran_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penangkaran" ADD CONSTRAINT "penangkaran_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengedaran_dalam_negeri" ADD CONSTRAINT "pengedaran_dalam_negeri_bidang_wilayah_id_wilayah_id_fk" FOREIGN KEY ("bidang_wilayah_id") REFERENCES "public"."wilayah"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengedaran_dalam_negeri" ADD CONSTRAINT "pengedaran_dalam_negeri_seksi_wilayah_id_wilayah_id_fk" FOREIGN KEY ("seksi_wilayah_id") REFERENCES "public"."wilayah"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengedaran_dalam_negeri" ADD CONSTRAINT "pengedaran_dalam_negeri_tsl_id_referensi_tsl_id_fk" FOREIGN KEY ("tsl_id") REFERENCES "public"."referensi_tsl"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengedaran_dalam_negeri" ADD CONSTRAINT "pengedaran_dalam_negeri_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengedaran_dalam_negeri" ADD CONSTRAINT "pengedaran_dalam_negeri_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengedaran_luar_negeri" ADD CONSTRAINT "pengedaran_luar_negeri_bidang_wilayah_id_wilayah_id_fk" FOREIGN KEY ("bidang_wilayah_id") REFERENCES "public"."wilayah"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengedaran_luar_negeri" ADD CONSTRAINT "pengedaran_luar_negeri_seksi_wilayah_id_wilayah_id_fk" FOREIGN KEY ("seksi_wilayah_id") REFERENCES "public"."wilayah"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengedaran_luar_negeri" ADD CONSTRAINT "pengedaran_luar_negeri_tsl_id_referensi_tsl_id_fk" FOREIGN KEY ("tsl_id") REFERENCES "public"."referensi_tsl"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengedaran_luar_negeri" ADD CONSTRAINT "pengedaran_luar_negeri_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengedaran_luar_negeri" ADD CONSTRAINT "pengedaran_luar_negeri_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lembaga_konservasi" ADD CONSTRAINT "lembaga_konservasi_bidang_wilayah_id_wilayah_id_fk" FOREIGN KEY ("bidang_wilayah_id") REFERENCES "public"."wilayah"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lembaga_konservasi" ADD CONSTRAINT "lembaga_konservasi_seksi_wilayah_id_wilayah_id_fk" FOREIGN KEY ("seksi_wilayah_id") REFERENCES "public"."wilayah"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lembaga_konservasi" ADD CONSTRAINT "lembaga_konservasi_tsl_id_referensi_tsl_id_fk" FOREIGN KEY ("tsl_id") REFERENCES "public"."referensi_tsl"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lembaga_konservasi" ADD CONSTRAINT "lembaga_konservasi_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lembaga_konservasi" ADD CONSTRAINT "lembaga_konservasi_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifikasi_log" ADD CONSTRAINT "verifikasi_log_diajukan_oleh_users_id_fk" FOREIGN KEY ("diajukan_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifikasi_log" ADD CONSTRAINT "verifikasi_log_verifikasi_oleh_users_id_fk" FOREIGN KEY ("verifikasi_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;