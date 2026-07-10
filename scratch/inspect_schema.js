const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

async function run() {
  try {
    const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
    const res = await fetch(url, {
      headers: {
        'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    });
    const spec = await res.json();
    console.log('Spec result:', spec);
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
run();
