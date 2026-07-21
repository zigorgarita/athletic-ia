import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseKey = val;
    }
  });
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  const sqlPath = path.join(process.cwd(), 'sql', 'fase_rivales_reports_schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Attempting DDL migration application...');

  // Intentar ejecutar via RPC si existe exec_sql
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.log('RPC exec_sql error/not present:', error.message);
  } else {
    console.log('✅ Migration applied via exec_sql!');
  }
}

applyMigration();
