const { createClient } = require('@supabase/supabase-js');
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log('Checking storage buckets...');
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.error('Error listing buckets:', bucketsErr.message);
    return;
  }
  
  console.log('Existing buckets:', buckets.map(b => b.name));
  const exists = buckets.some(b => b.name === 'player-photos');
  if (exists) {
    console.log('Bucket "player-photos" already exists!');
  } else {
    console.log('Bucket "player-photos" does NOT exist. Trying to create...');
    const { data, error } = await supabase.storage.createBucket('player-photos', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });
    if (error) {
      console.error('Error creating bucket:', error.message);
    } else {
      console.log('Bucket "player-photos" created successfully:', data);
    }
  }
}
run();
