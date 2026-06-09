DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_notifikasi') THEN
    CREATE TYPE "public"."status_notifikasi" AS ENUM('unread', 'read');
  END IF;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "notifikasi" (
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
  CONSTRAINT "notifikasi_user_target_unique" UNIQUE("user_id", "tabel_target", "target_id")
);--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifikasi_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "notifikasi"
      ADD CONSTRAINT "notifikasi_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
