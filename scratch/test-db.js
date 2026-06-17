const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing connection to:', supabaseUrl);
  
  // Test if detailed_evaluations table exists
  const { data: detData, error: detError } = await supabase
    .from('detailed_evaluations')
    .select('*')
    .limit(1);
    
  if (detError) {
    console.log('detailed_evaluations does not exist or error:', detError.message);
  } else {
    console.log('detailed_evaluations table exists! Records found:', detData.length);
  }

  // Test if matches table exists
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .limit(1);
    
  if (matchError) {
    console.log('matches does not exist or error:', matchError.message);
  } else {
    console.log('matches table exists! Records found:', matchData.length);
  }
}

test();
