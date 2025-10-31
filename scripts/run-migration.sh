#!/bin/bash

# Script to help run the migration
# This will either use Supabase CLI or provide manual instructions

MIGRATION_FILE="supabase/migrations/001_initial_schema.sql"

echo "🚀 Running Database Migration"
echo "================================"
echo ""

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found"
    
    # Check if linked to a project
    if [ -f "supabase/.temp/project-ref" ]; then
        echo "✅ Supabase project linked"
        echo ""
        echo "Running migration via Supabase CLI..."
        supabase db reset --db-url "$(supabase status | grep 'DB URL' | awk '{print $3}')" 2>/dev/null || {
            echo ""
            echo "⚠️  Could not auto-run via CLI. Using manual method..."
        }
    else
        echo "⚠️  Supabase project not linked"
        echo ""
        echo "To link your project, run:"
        echo "  supabase link --project-ref <your-project-ref>"
        echo ""
        echo "Or run the migration manually (see below)"
    fi
else
    echo "ℹ️  Supabase CLI not found"
fi

echo ""
echo "📋 Manual Migration Instructions:"
echo "================================"
echo ""
echo "1. Open your Supabase dashboard"
echo "2. Go to SQL Editor"
echo "3. Click 'New query'"
echo "4. Copy and paste the contents of: $MIGRATION_FILE"
echo "5. Click 'Run' (or press Cmd/Ctrl + Enter)"
echo ""
echo "📄 Migration file location:"
echo "   $(pwd)/$MIGRATION_FILE"
echo ""
echo "To view the migration file, run:"
echo "   cat $MIGRATION_FILE"
echo ""

