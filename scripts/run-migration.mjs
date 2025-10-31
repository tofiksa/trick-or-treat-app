#!/usr/bin/env node

/**
 * Run database migration using Supabase client
 * This requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('\nPlease ensure you have:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=your-project-url');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (or use anon key)');
  console.error('\nYou can find these in: Supabase Dashboard > Settings > API');
  process.exit(1);
}

// Read migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
let migrationSQL;

try {
  migrationSQL = readFileSync(migrationPath, 'utf8');
  console.log('✅ Migration file loaded\n');
} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🚀 Running migration...');
console.log('   URL:', supabaseUrl);
console.log('');

// Split SQL into individual statements and execute them
// Note: Supabase JS client doesn't have a direct SQL execution method
// We need to use the REST API directly or use pg client

// Alternative: Use the REST API to execute SQL
const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
  },
  body: JSON.stringify({ query: migrationSQL }),
}).catch(() => null);

if (!response || !response.ok) {
  // Fallback: Print instructions
  console.log('⚠️  Direct SQL execution via API requires a custom function.');
  console.log('\n📋 Please run the migration manually in Supabase:\n');
  console.log('1. Open: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor');
  console.log('4. Click "New query"');
  console.log('5. Copy and paste the SQL below:');
  console.log('\n' + '='.repeat(70));
  console.log(migrationSQL);
  console.log('='.repeat(70));
  console.log('\n6. Click "Run" button (or press Cmd/Ctrl + Enter)\n');
  process.exit(0);
}

console.log('✅ Migration executed successfully!');
console.log('\nWaiting 10 seconds for schema cache to refresh...');
await new Promise(resolve => setTimeout(resolve, 10000));

// Verify tables were created
const { data: groups, error } = await supabase
  .from('groups')
  .select('*')
  .limit(5);

if (error) {
  console.error('⚠️  Error verifying tables:', error.message);
  console.log('\nPlease check the Supabase dashboard to verify the migration completed.');
} else {
  console.log('✅ Verification successful!');
  console.log(`   Found ${groups?.length || 0} groups in database\n`);
}

process.exit(0);

