import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

import { defineConfig } from "drizzle-kit";

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_NAME:", process.env.DB_NAME);

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
<<<<<<< HEAD
    host: process.env.DB_HOST ?? "",
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "",
=======
    host: "localhost",
    port: 5433,
    user: "postgres",
    password: "postgres",
    database: "idamantsl_db",
    ssl: false,
>>>>>>> origin/ojan
  },
});