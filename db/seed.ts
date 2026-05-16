import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { wilayah, users } from "./schema";
import { eq } from "drizzle-orm";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const db = drizzle(pool, { schema });

async function seedWilayah() {
  const existing = await db.query.wilayah.findFirst();

  if (existing) {
    console.log("⚠️  Data wilayah sudah ada, skip.");
    return;
  }

  await db.insert(wilayah).values([
    // Bidang Wilayah
    { nomorWilayah: "I", namaWilayah: "Bogor", alamatWilayah: "Bogor", tipeWilayah: "bidang" },
    { nomorWilayah: "II", namaWilayah: "Soreang", alamatWilayah: "Soreang", tipeWilayah: "bidang" },
    { nomorWilayah: "III", namaWilayah: "Ciamis", alamatWilayah: "Ciamis", tipeWilayah: "bidang" },

    // Seksi Wilayah
    { nomorWilayah: "I", namaWilayah: "Serang", alamatWilayah: "Serang", tipeWilayah: "seksi" },
    { nomorWilayah: "II", namaWilayah: "Bogor", alamatWilayah: "Bogor", tipeWilayah: "seksi" },
    { nomorWilayah: "III", namaWilayah: "Soreang", alamatWilayah: "Soreang", tipeWilayah: "seksi" },
    { nomorWilayah: "IV", namaWilayah: "Purwakarta", alamatWilayah: "Purwakarta", tipeWilayah: "seksi" },
    { nomorWilayah: "V", namaWilayah: "Garut", alamatWilayah: "Garut", tipeWilayah: "seksi" },
    { nomorWilayah: "VI", namaWilayah: "Tasikmalaya", alamatWilayah: "Tasikmalaya", tipeWilayah: "seksi" },
  ]);

  console.log("✅ Data wilayah dibuat!");
}

async function seedAdmin() {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, "admin@bbksda-jabar.id"),
  });

  if (existing) {
    console.log("⚠️  Akun admin sudah ada, skip.");
    return;
  }

  const hashedPassword = await bcrypt.hash("admin123", 10);

  await db.insert(users).values({
    nama: "Admin BBKSDA Jabar",
    email: "admin@bbksda-jabar.id",
    password: hashedPassword,
    nomorTelepon: null,
    role: "admin_pusat",
    wilayahId: null,
    isActive: true,
  });

  console.log("✅ Akun admin dibuat!");
}
async function seedBidangWilayah() {
  const usersData = [
    {
      nama: "Bidang KSDA I Bogor",
      email: "bidang1@bbksda.id",
      role: "bidang_wilayah" as const,
      wilayahId: 1,
    },
    {
      nama: "Bidang KSDA II Soreang",
      email: "bidang2@bbksda.id",
      role: "bidang_wilayah" as const,
      wilayahId: 2,
    },
    {
      nama: "Bidang KSDA III Ciamis",
      email: "bidang3@bbksda.id",
      role: "bidang_wilayah" as const,
      wilayahId: 3,
    },
  ];

  for (const user of usersData) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, user.email),
    });

    if (!existing) {
      await db.insert(users).values({
        ...user,
        password: await bcrypt.hash("admin123", 10),
        nomorTelepon: null,
        isActive: true,
      });
    }
  }

  console.log("✅ User bidang wilayah dibuat!");
}
async function main() {
  console.log("Memulai proses seeding...\n");

  console.log("Seeding data wilayah...");
  await seedWilayah();

  console.log("Seeding akun Admin Pusat...");
  await seedAdmin();
  await seedBidangWilayah();
  console.log("\n✅ Seed selesai!");
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Seed gagal:", err);
  process.exit(1);
});