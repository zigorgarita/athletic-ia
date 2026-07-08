const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line && line.includes('=')) {
    const [key, ...vals] = line.split('=');
    env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runDiagnostics() {
  console.log('--- STARTING DIAGNOSTICS ---');

  // 1. Check if the bucket exists and we can access it
  console.log('\n[1] Checking Storage Bucket...');
  const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('indautxu-assets');
  if (bucketError) {
    console.error('Bucket Error:', bucketError.message);
  } else {
    console.log('Bucket "indautxu-assets" exists and is accessible.');
  }

  // 2. Upload a dummy PDF file to mimic `handlePdfUpload`
  console.log('\n[2] Uploading test PDF to Storage...');
  const fileName = `session-test-${Math.random().toString(36).substring(2, 15)}.pdf`;
  const filePath = `planning-pdfs/${fileName}`;
  const dummyBuffer = Buffer.from('dummy pdf content');
  
  const { error: uploadError } = await supabase.storage
    .from('indautxu-assets')
    .upload(filePath, dummyBuffer, { contentType: 'application/pdf' });

  if (uploadError) {
    console.error('Upload Error:', uploadError.message);
    return;
  }
  console.log(`File uploaded successfully to: ${filePath}`);

  // 3. Get Public URL
  console.log('\n[3] Generating Public URL...');
  const { data } = supabase.storage.from('indautxu-assets').getPublicUrl(filePath);
  const publicUrl = data.publicUrl;
  console.log(`Public URL: ${publicUrl}`);

  // 4. Save URL to `planning_sessions` using `exec_secure_upsert`
  console.log('\n[4] Saving URL to database (mimicking handleSaveReal)...');
  const targetDate = '2026-07-27'; // Fixed test date
  const sessionId = 'bccdcc21-548a-4fbc-9a89-5d77ec0aeef4'; // The ID we know exists for this date

  const payload = {
    id: sessionId,
    fecha: targetDate,
    evaluacion_observaciones: `\nPDF: ${publicUrl}`
  };

  const { data: saveResult, error: saveError } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'planning_sessions',
    payload: payload,
    conflict_columns: ['id'],
    staff_passkey: 'indautxu2026'
  });

  if (saveError) {
    console.error('Database Save Error:', saveError.message);
    return;
  }
  console.log(`Database updated successfully. evaluacion_observaciones value saved: \nPDF: ${publicUrl}`);

  // 5. Fetch the session back (mimicking fetchWeekData)
  console.log('\n[5] Fetching session back from database (mimicking fetchWeekData)...');
  const { data: fetchResult, error: fetchError } = await supabase
    .from('planning_sessions')
    .select('id, fecha, evaluacion_observaciones')
    .eq('id', sessionId)
    .single();

  if (fetchError) {
    console.error('Fetch Error:', fetchError.message);
    return;
  }
  
  if (fetchResult.evaluacion_observaciones) {
    console.log(`Session fetched successfully!`);
    console.log(`Returned value for evaluacion_observaciones: ${fetchResult.evaluacion_observaciones}`);
  } else {
    console.error('ERROR: Database returned NULL or EMPTY for evaluacion_observaciones!');
  }

  // 6. Test parsing (mimicking getPdfUrl in React)
  console.log('\n[6] Parsing URL from fetched value (mimicking getPdfUrl)...');
  const obs = fetchResult.evaluacion_observaciones || '';
  if (obs.includes('PDF:')) {
    const extractedUrl = obs.split('PDF:')[1].trim();
    console.log(`Parsed URL: ${extractedUrl}`);
    if (extractedUrl === publicUrl) {
      console.log('SUCCESS: Extracted URL matches the original public URL.');
    } else {
      console.error('ERROR: Extracted URL does NOT match original URL.');
    }
  } else {
    console.error('ERROR: "PDF:" string not found in fetched value.');
  }

  console.log('\n--- DIAGNOSTICS COMPLETE ---');
}

runDiagnostics();
