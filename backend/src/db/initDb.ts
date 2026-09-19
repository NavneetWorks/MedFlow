import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from './database';

async function initDb() {
  console.log('----------------------------------------------------');
  console.log('[MEDFLOW] Initializing Patients Table in Supabase...');
  console.log('----------------------------------------------------');

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await query(sql);
    console.log('✅ [SUCCESS] `patients` Table Created Successfully in Supabase!');
    console.log('----------------------------------------------------');
  } catch (error: any) {
    console.error('❌ [ERROR] Failed to create patients table:', error.message || error);
  } finally {
    await pool.end();
  }
}

initDb();
