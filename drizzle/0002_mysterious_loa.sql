CREATE TYPE "public"."status_notifikasi" AS ENUM('unread', 'read');--> statement-breakpoint
ALTER TYPE "public"."status_cites" ADD VALUE 'non_apendiks' BEFORE 'apendiks_i';--> statement-breakpoint
CREATE TABLE "notifikasi" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" "status_notifikasi" DEFAULT 'unread' NOT NULL,
	"tabel_target" "tabel_target" NOT NULL,
	"target_id" integer NOT NULL,
	"nomor_sk" text,
	"tanggal_kadaluarsa" timestamp,
	"judul" text NOT NULL,
	"pesan" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notifikasi_user_target_unique" UNIQUE("user_id","tabel_target","target_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_history" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status_notifikasi" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "jumlah_notifikasi" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "wilayah" ADD COLUMN "parent_wilayah_id" integer;--> statement-breakpoint
ALTER TABLE "penangkaran" ADD COLUMN "jumlah_tsl" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "penangkaran" ADD COLUMN "tsl_items" json;--> statement-breakpoint
ALTER TABLE "pengedaran_dalam_negeri" ADD COLUMN "jumlah_tsl" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "pengedaran_dalam_negeri" ADD COLUMN "tsl_items" json;--> statement-breakpoint
ALTER TABLE "pengedaran_luar_negeri" ADD COLUMN "jumlah_tsl" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "pengedaran_luar_negeri" ADD COLUMN "tsl_items" json;--> statement-breakpoint
ALTER TABLE "lembaga_konservasi" ADD COLUMN "jumlah_tsl" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "lembaga_konservasi" ADD COLUMN "tsl_items" json;--> statement-breakpoint
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referensi_tsl" ADD CONSTRAINT "referensi_tsl_nama_daerah_unique" UNIQUE("nama_daerah");--> statement-breakpoint
ALTER TABLE "penangkaran" ADD CONSTRAINT "penangkaran_nomor_sk_unique" UNIQUE("nomor_sk");--> statement-breakpoint
ALTER TABLE "pengedaran_dalam_negeri" ADD CONSTRAINT "pengedaran_dn_nomor_sk_unique" UNIQUE("nomor_sk");--> statement-breakpoint
ALTER TABLE "pengedaran_luar_negeri" ADD CONSTRAINT "pengedaran_ln_nomor_sk_unique" UNIQUE("nomor_sk");--> statement-breakpoint
ALTER TABLE "lembaga_konservasi" ADD CONSTRAINT "lembaga_konservasi_nomor_sk_unique" UNIQUE("nomor_sk");