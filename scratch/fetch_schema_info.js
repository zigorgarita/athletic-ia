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

const url = env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/';
const apiKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

fetch(url, {
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`
  }
})
.then(async res => {
  const text = await res.text();
  console.log('Status:', res.status);
  try {
    const json = JSON.parse(text);
    console.log('Keys of response:', Object.keys(json));
    if (json.definitions) {
      console.log('Definitions keys:', Object.keys(json.definitions));
    } else if (json.paths) {
      console.log('Paths keys:', Object.keys(json.paths));
    } else {
      console.log('Full JSON response:', text.substring(0, 1000));
    }
  } catch (e) {
    console.log('Not JSON. Response text:', text.substring(0, 1000));
  }
})
.catch(err => {
  console.error('Fetch error:', err);
});
