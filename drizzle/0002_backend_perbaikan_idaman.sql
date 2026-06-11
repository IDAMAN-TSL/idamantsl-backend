ALTER TYPE "public"."status_cites" ADD VALUE IF NOT EXISTS 'non_apendiks' BEFORE 'apendiks_i';--> statement-breakpoint

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_history" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status_notifikasi" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "jumlah_notifikasi" integer DEFAULT 0;--> statement-breakpoint

ALTER TABLE "wilayah" ADD COLUMN IF NOT EXISTS "parent_wilayah_id" integer;--> statement-breakpoint
UPDATE "wilayah" SET "parent_wilayah_id" = (SELECT id FROM "wilayah" WHERE lower("nama_wilayah") = 'bogor' AND "tipe_wilayah" = 'bidang' LIMIT 1) WHERE lower("nama_wilayah") IN ('serang', 'bogor') AND "tipe_wilayah" = 'seksi';--> statement-breakpoint
UPDATE "wilayah" SET "parent_wilayah_id" = (SELECT id FROM "wilayah" WHERE lower("nama_wilayah") = 'soreang' AND "tipe_wilayah" = 'bidang' LIMIT 1) WHERE lower("nama_wilayah") IN ('soreang', 'purwakarta') AND "tipe_wilayah" = 'seksi';--> statement-breakpoint
UPDATE "wilayah" SET "parent_wilayah_id" = (SELECT id FROM "wilayah" WHERE lower("nama_wilayah") = 'ciamis' AND "tipe_wilayah" = 'bidang' LIMIT 1) WHERE lower("nama_wilayah") IN ('garut', 'tasikmalaya') AND "tipe_wilayah" = 'seksi';--> statement-breakpoint

ALTER TABLE "penangkaran" ADD COLUMN IF NOT EXISTS "jumlah_tsl" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "penangkaran" ADD COLUMN IF NOT EXISTS "tsl_items" json;--> statement-breakpoint
UPDATE "penangkaran" SET "jumlah_tsl" = COALESCE("jumlah_tsl", 1), "tsl_items" = CASE WHEN "tsl_id" IS NULL THEN '[]'::json ELSE json_build_array(json_build_object('tslId', "tsl_id", 'statusPerlindunganNasional', "status_perlindungan_nasional", 'statusCites', "status_cites", 'statusIucn', "status_iucn", 'jantan', "jantan", 'betina', "betina")) END WHERE "tsl_items" IS NULL;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "penangkaran" WHERE "nomor_sk" IS NOT NULL GROUP BY "nomor_sk" HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "penangkaran_nomor_sk_unique" ON "penangkaran" ("nomor_sk") WHERE "nomor_sk" IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skip unique index penangkaran_nomor_sk_unique karena masih ada nomor_sk duplikat di data lama';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "pengedaran_dalam_negeri" ADD COLUMN IF NOT EXISTS "jumlah_tsl" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "pengedaran_dalam_negeri" ADD COLUMN IF NOT EXISTS "tsl_items" json;--> statement-breakpoint
UPDATE "pengedaran_dalam_negeri" SET "jumlah_tsl" = COALESCE("jumlah_tsl", 1), "tsl_items" = CASE WHEN "tsl_id" IS NULL THEN '[]'::json ELSE json_build_array(json_build_object('tslId', "tsl_id", 'statusPerlindunganNasional', "status_perlindungan_nasional", 'statusCites', "status_cites", 'statusIucn', "status_iucn", 'jantan', "jantan", 'betina', "betina")) END WHERE "tsl_items" IS NULL;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "pengedaran_dalam_negeri" WHERE "nomor_sk" IS NOT NULL GROUP BY "nomor_sk" HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "pengedaran_dn_nomor_sk_unique" ON "pengedaran_dalam_negeri" ("nomor_sk") WHERE "nomor_sk" IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skip unique index pengedaran_dn_nomor_sk_unique karena masih ada nomor_sk duplikat di data lama';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "pengedaran_luar_negeri" ADD COLUMN IF NOT EXISTS "jumlah_tsl" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "pengedaran_luar_negeri" ADD COLUMN IF NOT EXISTS "tsl_items" json;--> statement-breakpoint
UPDATE "pengedaran_luar_negeri" SET "jumlah_tsl" = COALESCE("jumlah_tsl", 1), "tsl_items" = CASE WHEN "tsl_id" IS NULL THEN '[]'::json ELSE json_build_array(json_build_object('tslId', "tsl_id", 'statusPerlindunganNasional', "status_perlindungan_nasional", 'statusCites', "status_cites", 'statusIucn', "status_iucn", 'jantan', "jantan", 'betina', "betina")) END WHERE "tsl_items" IS NULL;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "pengedaran_luar_negeri" WHERE "nomor_sk" IS NOT NULL GROUP BY "nomor_sk" HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "pengedaran_ln_nomor_sk_unique" ON "pengedaran_luar_negeri" ("nomor_sk") WHERE "nomor_sk" IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skip unique index pengedaran_ln_nomor_sk_unique karena masih ada nomor_sk duplikat di data lama';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "lembaga_konservasi" ADD COLUMN IF NOT EXISTS "jumlah_tsl" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "lembaga_konservasi" ADD COLUMN IF NOT EXISTS "tsl_items" json;--> statement-breakpoint
UPDATE "lembaga_konservasi" SET "jumlah_tsl" = COALESCE("jumlah_tsl", 1), "tsl_items" = CASE WHEN "tsl_id" IS NULL THEN '[]'::json ELSE json_build_array(json_build_object('tslId', "tsl_id", 'statusPerlindunganNasional', "status_perlindungan_nasional", 'statusCites', "status_cites", 'statusIucn', "status_iucn", 'jantan', "jantan", 'betina', "betina")) END WHERE "tsl_items" IS NULL;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "lembaga_konservasi" WHERE "nomor_sk" IS NOT NULL GROUP BY "nomor_sk" HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "lembaga_konservasi_nomor_sk_unique" ON "lembaga_konservasi" ("nomor_sk") WHERE "nomor_sk" IS NOT NULL;
  ELSE
    RAISE NOTICE 'Skip unique index lembaga_konservasi_nomor_sk_unique karena masih ada nomor_sk duplikat di data lama';
  END IF;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "referensi_tsl" WHERE "nama_daerah" IS NOT NULL GROUP BY "nama_daerah" HAVING count(*) > 1) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "referensi_tsl_nama_daerah_unique" ON "referensi_tsl" ("nama_daerah");
  ELSE
    RAISE NOTICE 'Skip unique index referensi_tsl_nama_daerah_unique karena masih ada nama_daerah duplikat di data lama';
  END IF;
END $$;
