// Script Node.js idempotente para calcular file_hash de documentos existentes
// Ejecución: node scripts/backfill-hashes.mjs

import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son necesarios.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log('--- BACKFILL HASHES ARCHIVOS EXISTENTES ---');

  const { data: docs, error } = await supabase
    .from('club_documents')
    .select('id, nombre, url')
    .is('file_hash', null)
    .not('url', 'is', null);

  if (error) {
    console.error('Error consultando club_documents:', error.message);
    process.exit(1);
  }

  if (!docs || docs.length === 0) {
    console.log('No existen documentos sin file_hash.');
    return;
  }

  let count = 0;
  for (const doc of docs) {
    try {
      console.log(`Descargando "${doc.nombre}"...`);
      const res = await fetch(doc.url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const hash = createHash('sha256').update(buffer).digest('hex');

      const { error: upErr } = await supabase
        .from('club_documents')
        .update({ file_hash: hash })
        .eq('id', doc.id)
        .is('file_hash', null);

      if (upErr) throw upErr;
      console.log(`  ✅ Hash: ${hash.slice(0, 16)}...`);
      count++;
    } catch (err) {
      console.warn(`  ⚠️ Error en "${doc.nombre}":`, err instanceof Error ? err.message : String(err));
    }
  }

  console.log(`Completado. ${count} documentos actualizados con file_hash.`);
}

main().catch(console.error);
