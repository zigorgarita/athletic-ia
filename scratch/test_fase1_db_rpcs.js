const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2].trim();
        // Remove surrounding quotes if any
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
} catch (err) {
  console.warn("Could not read .env.local manually:", err.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing SUPABASE env vars. Url:", supabaseUrl, "Key:", supabaseAnonKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log("=== DB Security & RPC Validation ===");
  
  // 1. Verify direct INSERT fails due to RLS
  console.log("\n1. Testing direct INSERT on 'players' (should FAIL):");
  const { data: directData, error: directError } = await supabase
    .from('players')
    .insert({ nombre: 'Direct Test', apellidos: 'Player', dorsal: 97, demarcacion: 'Portero', fecha_nacimiento: '2008-01-01' });
  
  if (directError) {
    console.log("SUCCESS: Direct insert rejected as expected. Error:", directError.message);
  } else {
    console.log("FAILURE: Direct insert was ALLOWED. RLS is not active or correctly configured.");
  }

  // 2. Test secure INSERT via RPC with correct passkey
  console.log("\n2. Testing exec_secure_upsert with CORRECT passkey:");
  const testPlayerPayload = {
    nombre: 'Test Player',
    apellidos: 'Agent',
    dorsal: 97,
    demarcacion: 'Portero',
    fecha_nacimiento: '2008-01-01'
  };

  const { data: upsertData, error: upsertError } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'players',
    payload: testPlayerPayload,
    conflict_columns: null,
    staff_passkey: 'indautxu2026'
  });

  if (upsertError) {
    console.error("FAILURE: exec_secure_upsert failed:", upsertError);
    return;
  }

  console.log("SUCCESS: Player created successfully via RPC! Data:", upsertData);
  const playerId = upsertData.id;

  // 3. Test exec_secure_upsert with INCORRECT passkey
  console.log("\n3. Testing exec_secure_upsert with INCORRECT passkey (should FAIL):");
  const { data: badData, error: badError } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'players',
    payload: { nombre: 'Fake', apellidos: 'Player', dorsal: 88, demarcacion: 'Portero', fecha_nacimiento: '2008-01-01' },
    conflict_columns: null,
    staff_passkey: 'wrong_key'
  });

  if (badError) {
    console.log("SUCCESS: Rejected with wrong passkey. Error:", badError.message);
  } else {
    console.log("FAILURE: Insert with wrong passkey was ALLOWED!");
  }

  // 4. Test UPDATE via RPC
  console.log("\n4. Testing UPDATE via exec_secure_upsert (matching conflict columns ID):");
  const updatePayload = {
    id: playerId,
    nombre: 'Test Player Agent Modified',
    apellidos: 'Agent',
    dorsal: 97,
    demarcacion: 'Defensa',
    fecha_nacimiento: '2008-01-01'
  };

  const { data: updateData, error: updateError } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'players',
    payload: updatePayload,
    conflict_columns: ['id'],
    staff_passkey: 'indautxu2026'
  });

  if (updateError) {
    console.error("FAILURE: Update failed:", updateError.message);
  } else {
    console.log("SUCCESS: Player updated via RPC! New name:", updateData.nombre, "dorsal:", updateData.dorsal);
  }

  // 5. Test secure DELETE via RPC
  console.log("\n5. Testing exec_secure_delete with CORRECT passkey:");
  const { data: deleteData, error: deleteError } = await supabase.rpc('exec_secure_delete', {
    target_table: 'players',
    record_id: playerId,
    staff_passkey: 'indautxu2026'
  });

  if (deleteError) {
    console.error("FAILURE: Delete failed:", deleteError.message);
  } else {
    console.log("SUCCESS: Player deleted successfully via RPC!");
  }

  console.log("\n=== Test Suite finished ===");
}

runTests();
