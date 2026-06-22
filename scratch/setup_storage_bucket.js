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
  console.log('Attempting to create bucket planning-documents...');
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.error('Error listing buckets:', bucketsErr.message);
  } else {
    console.log('Existing buckets:', buckets.map(b => b.name));
    const exists = buckets.some(b => b.name === 'planning-documents');
    if (exists) {
      console.log('Bucket "planning-documents" already exists!');
    } else {
      console.log('Bucket "planning-documents" does NOT exist. Trying to create...');
      const { data, error } = await supabase.storage.createBucket('planning-documents', {
        public: true,
        allowedMimeTypes: ['application/pdf'],
        fileSizeLimit: 10485760 // 10MB
      });
      if (error) {
        console.error('Error creating bucket via Client SDK:', error.message);
        console.log('Note: RLS policies might prevent client bucket creation. You may need to create the bucket "planning-documents" and tables manually in the Supabase Dashboard.');
      } else {
        console.log('Bucket "planning-documents" created successfully:', data);
      }
    }
  }
}

run();
