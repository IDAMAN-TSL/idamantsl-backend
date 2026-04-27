import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "fintech_db",
    ssl: false,
  },
});