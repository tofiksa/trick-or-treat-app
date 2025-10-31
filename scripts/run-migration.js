#!/usr/bin/env node

/**
 * Script to run the database migration directly via Supabase API
 * This uses the Supabase REST API to execute SQL
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please set the following environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  console.error('\nAlternatively, run the migration manually in Supabase SQL Editor:');
  console.error('  1. Open your Supabase project dashboard');
  console.error('  2. Go to SQL Editor');
  console.error('  3. Copy and paste the contents of supabase/migrations/001_initial_schema.sql');
  console.error('  4. Click Run');
  process.exit(1);
}

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_initial_schema.sql');
let migrationSQL;

try {
  migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log('✅ Migration file loaded');
} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
  process.exit(1);
}

// Execute SQL via Supabase REST API
const url = new URL(supabaseUrl);
const apiPath = '/rest/v1/rpc/exec_sql';

// Note: This approach requires a custom function or direct SQL endpoint
// For now, we'll provide instructions to run manually
console.log('\n⚠️  Direct SQL execution via API is not available in standard Supabase.');
console.log('\n📋 Please run the migration manually:\n');
console.log('1. Open your Supabase dashboard:');
console.log(`   ${supabaseUrl.replace('/rest/v1', '')}`);
console.log('\n2. Go to SQL Editor');
console.log('\n3. Copy and paste this SQL:');
console.log('\n' + '='.repeat(60));
console.log(migrationSQL);
console.log('='.repeat(60));
console.log('\n4. Click "Run" button\n');

process.exit(0);

