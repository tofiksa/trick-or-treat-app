#!/usr/bin/env node

/**
 * Wipe all app data via Supabase API:
 * - all objects in storage bucket `candy-photos`
 * - all rows in photos → checkins → users → groups
 * - re-seed Team Pumpkin / Team Ghost
 *
 * Requires service role key (RLS has no DELETE policies).
 *
 * Usage:
 *   node scripts/wipe-database.mjs           # dry-run / refuse
 *   node scripts/wipe-database.mjs --confirm # actually delete
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const BUCKET = 'candy-photos';
const TABLES = ['photos', 'checkins', 'users', 'groups'];
const DEFAULT_GROUPS = ['Team Pumpkin', 'Team Ghost'];
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

const confirmed = process.argv.includes('--confirm');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing credentials in .env.local');
  console.error('Required:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=...');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=...  (Dashboard → Settings → API → service_role)');
  process.exit(1);
}

if (!confirmed) {
  console.error('Refusing to wipe without --confirm');
  console.error('');
  console.error('This permanently deletes:');
  console.error(`  - all files in storage bucket "${BUCKET}"`);
  console.error(`  - all rows in: ${TABLES.join(', ')}`);
  console.error('Then re-seeds groups: Team Pumpkin, Team Ghost');
  console.error('');
  console.error('Run:  npm run wipe-db -- --confirm');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function listObjectPaths(prefix = '') {
  const paths = [];
  const limit = 100;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw new Error(`Failed to list "${prefix || '/'}": ${error.message}`);
    }

    if (!data?.length) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders have null/undefined id and no metadata; files have id
      const isFolder = entry.id === null;
      if (isFolder) {
        paths.push(...(await listObjectPaths(path)));
      } else {
        paths.push(path);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return paths;
}

async function wipeStorage() {
  console.log(`\nStorage: listing ${BUCKET}...`);
  let paths;
  try {
    paths = await listObjectPaths('');
  } catch (err) {
    if (String(err.message).includes('not found') || String(err.message).includes('Bucket')) {
      console.log(`  Bucket missing or empty — skipping (${err.message})`);
      return 0;
    }
    throw err;
  }

  if (paths.length === 0) {
    console.log('  No files to delete');
    return 0;
  }

  console.log(`  Deleting ${paths.length} file(s)...`);
  const chunkSize = 100;
  let deleted = 0;

  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await supabase.storage.from(BUCKET).remove(chunk);
    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`);
    }
    deleted += chunk.length;
  }

  console.log(`  Deleted ${deleted} file(s)`);
  return deleted;
}

async function wipeTable(table) {
  // Service role bypasses RLS; filter required by PostgREST for DELETE
  const { data, error } = await supabase
    .from(table)
    .delete()
    .neq('id', ZERO_UUID)
    .select('id');

  if (error) {
    throw new Error(`Failed to wipe ${table}: ${error.message}`);
  }

  const count = data?.length ?? 0;
  console.log(`  ${table}: deleted ${count} row(s)`);
  return count;
}

async function seedGroups() {
  const { data, error } = await supabase
    .from('groups')
    .upsert(
      DEFAULT_GROUPS.map((name) => ({ name })),
      { onConflict: 'name', ignoreDuplicates: true },
    )
    .select('id, name');

  if (error) {
    // Fallback if upsert unsupported / conflict target issues
    for (const name of DEFAULT_GROUPS) {
      const { error: insertError } = await supabase.from('groups').insert({ name });
      if (insertError && !insertError.message.includes('duplicate')) {
        throw new Error(`Failed to seed group "${name}": ${insertError.message}`);
      }
    }
    const { data: groups, error: listError } = await supabase
      .from('groups')
      .select('id, name');
    if (listError) throw new Error(`Failed to list groups: ${listError.message}`);
    console.log(`  Seeded/kept groups: ${(groups ?? []).map((g) => g.name).join(', ')}`);
    return;
  }

  console.log(`  Seeded/kept groups: ${(data ?? []).map((g) => g.name).join(', ') || DEFAULT_GROUPS.join(', ')}`);
}

async function main() {
  console.log('Wiping Supabase app data...');
  console.log(`URL: ${supabaseUrl}`);

  const filesDeleted = await wipeStorage();

  console.log('\nTables:');
  const counts = {};
  for (const table of TABLES) {
    counts[table] = await wipeTable(table);
  }

  console.log('\nRe-seeding default groups...');
  await seedGroups();

  console.log('\nDone.');
  console.log(
    JSON.stringify(
      { storageFilesDeleted: filesDeleted, rowsDeleted: counts },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('\nWipe failed:', err.message || err);
  process.exit(1);
});
