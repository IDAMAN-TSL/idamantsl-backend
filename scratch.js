const { Pool } = require('pg'); 
require('dotenv').config(); 
const p = new Pool({
  host: process.env.DB_HOST, 
  port: process.env.DB_PORT, 
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME
}); 

async function run() {
  const tables = ['penangkaran', 'pengedaran_dalam_negeri', 'pengedaran_luar_negeri', 'lembaga_konservasi'];
  let totalDeleted = 0;
  for (const table of tables) {
    try {
      const res = await p.query(`
        DELETE FROM ${table} a 
        USING ${table} b 
        WHERE a.nomor_sk = b.nomor_sk 
          AND a.id > b.id
      `);
      console.log(`Deleted ${res.rowCount} rows from ${table}`);
      totalDeleted += res.rowCount;
    } catch(e) {
      console.error(e);
    }
  }
  console.log('Total deleted:', totalDeleted);
  process.exit(0);
}

run();
