import { pool, query } from './database';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('----------------------------------------------------');
  console.log('[MEDFLOW] Testing Supabase PostgreSQL Connection...');
  console.log('----------------------------------------------------');

  try {
    const client = await pool.connect();
    console.log('✅ [STEP 1/2] Successfully established socket connection to Supabase!');
    client.release();

    const res = await query<{ current_time: string; db_name: string }>(
      'SELECT NOW() as current_time, current_database() as db_name;'
    );

    if (res && res.length > 0) {
      console.log(`✅ [STEP 2/2] SQL Query Executed Successfully!`);
      console.log(`   Database Name : ${res[0].db_name}`);
      console.log(`   Server Time   : ${res[0].current_time}`);
      console.log('----------------------------------------------------');
      console.log('🎉 DB CONNECTION IS 100% WORKING & READY!');
      console.log('----------------------------------------------------');
    }
  } catch (error: any) {
    console.error('❌ [ERROR] Database Connection Failed!');
    console.error('   Details:', error.message || error);
    console.log('----------------------------------------------------');
    console.log('👉 Please check if your DATABASE_URL in backend/.env has the correct password.');
    console.log('----------------------------------------------------');
  } finally {
    await pool.end();
  }
}

testConnection();
