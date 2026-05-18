import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,

  // ── Resilience config ──────────────────────────────────────────────────
  // max: jumlah koneksi maksimum di pool. 10 cukup untuk dev.
  max: 10,
  // idleTimeoutMillis: koneksi idle akan dibuang setelah waktu ini, supaya
  // koneksi "stale" (mis. setelah server DB restart) tidak menumpuk.
  idleTimeoutMillis: 30_000,
  // connectionTimeoutMillis: berapa lama nunggu koneksi baru sebelum nyerah.
  connectionTimeoutMillis: 10_000,
});

// pg Pool tidak otomatis crash kalau koneksi error di background.
// Kita log saja supaya kelihatan di terminal.
pool.on("error", (err) => {
  console.error("[pg pool error]", err.message);
});

export const db = drizzle(pool, { schema });
