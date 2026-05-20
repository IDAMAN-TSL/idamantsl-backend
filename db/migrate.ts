/**
 * migrate.ts
 *
 * Script migrasi manual yang membaca file SQL dari folder drizzle/
 * dan menjalankannya ke database. Tidak butuh drizzle-kit migrate.
 *
 * Jalankan: npx tsx db/migrate.ts
 */

import "dotenv/config";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function main() {
    const client = await pool.connect();

    try {
        // Buat tabel tracking kalau belum ada
        await client.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL UNIQUE,
        created_at BIGINT
      );
    `);

        // Baca semua file .sql di folder drizzle/ (urut nama)
        const drizzleDir = path.resolve(__dirname, "../drizzle");
        const files = fs.readdirSync(drizzleDir)
            .filter(f => f.endsWith(".sql"))
            .sort();

        console.log(`Ditemukan ${files.length} file migrasi.\n`);

        for (const file of files) {
            const hash = file.replace(".sql", "");

            // Cek apakah sudah pernah dijalankan
            const { rows } = await client.query(
                `SELECT id FROM "__drizzle_migrations" WHERE hash = $1`,
                [hash]
            );

            if (rows.length > 0) {
                console.log(`⏭️  ${file} — sudah dijalankan, skip.`);
                continue;
            }

            // Baca dan jalankan SQL
            const sql = fs.readFileSync(path.join(drizzleDir, file), "utf8");
            // Split by statement breakpoint marker
            const statements = sql.split("--> statement-breakpoint");

            console.log(`▶️  ${file} — menjalankan ${statements.length} statement...`);

            for (const stmt of statements) {
                const trimmed = stmt.trim();
                if (trimmed) {
                    await client.query(trimmed);
                }
            }

            // Catat di tabel tracking
            await client.query(
                `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
                [hash, Date.now()]
            );

            console.log(`✅ ${file} — berhasil.`);
        }

        console.log("\n✅ Semua migrasi selesai!");
    } catch (error: any) {
        // Kalau error karena "already exists", skip saja
        if (error.code === "42P07" || error.code === "42710") {
            console.log(`⚠️  Object sudah ada (${error.message}), melanjutkan...`);
        } else {
            console.error("❌ Migrasi gagal:", error.message);
            process.exit(1);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

main();
