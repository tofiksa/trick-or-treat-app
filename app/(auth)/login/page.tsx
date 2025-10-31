'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Group } from '@/types/database';
import { translateTeamName, getTeamEmoji } from '@/lib/utils/translations';
import AvatarSelector from '@/components/AvatarSelector';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('🎃');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoadingGroups(true);
      const { data, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .order('name');
      
      console.log('Groups loaded:', { data, groupsError });
      
      if (groupsError) {
        console.error('Error loading groups:', groupsError);
        // Fallback to default groups if query fails
        const fallbackGroups = [
          { id: 'team-pumpkin', name: 'Lag Gresskar', created_at: new Date().toISOString() },
          { id: 'team-ghost', name: 'Lag Spøkelse', created_at: new Date().toISOString() },
        ];
        console.log('Using fallback groups:', fallbackGroups);
        setGroups(fallbackGroups);
      } else if (data && data.length > 0) {
        console.log('Loaded groups from database:', data);
        setGroups(data);
      } else {
        // If no groups exist, use fallback
        console.log('No groups in database, using fallback');
        const fallbackGroups = [
          { id: 'team-pumpkin', name: 'Team Pumpkin', created_at: new Date().toISOString() },
          { id: 'team-ghost', name: 'Team Ghost', created_at: new Date().toISOString() },
        ];
        setGroups(fallbackGroups);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
      // Fallback groups
      const fallbackGroups = [
        { id: 'team-pumpkin', name: 'Team Pumpkin', created_at: new Date().toISOString() },
        { id: 'team-ghost', name: 'Team Ghost', created_at: new Date().toISOString() },
      ];
      setGroups(fallbackGroups);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedGroup) {
      setError('Vennligst skriv inn navnet ditt og velg et lag');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get or create user
      const { data: { user } } = await supabase.auth.signInAnonymously();
      
      if (!user) {
        throw new Error('Kunne ikke opprette anonym bruker');
      }

      // Get or create user profile
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      // Get group ID from name if needed (backwards compatibility)
      let groupId = selectedGroup;
      if (!selectedGroup.includes('-')) {
        // If it's a group name, find the ID
        const matchingGroup = groups.find(g => g.id === selectedGroup || g.name === selectedGroup);
        if (matchingGroup) {
          groupId = matchingGroup.id;
        }
      }

      if (existingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('users')
          .update({ name: name.trim(), group_id: groupId, avatar: selectedAvatar })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new user
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            name: name.trim(),
            group_id: groupId,
            avatar: selectedAvatar,
          });

        if (insertError) throw insertError;
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Kunne ikke logge inn');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black-primary p-4">
      <main className="w-full max-w-md">
        <div className="flex flex-col items-center gap-8">
          <h1 className="text-4xl font-bold text-orange-primary md:text-5xl">
            🎃 Bli med i konkurransen
          </h1>
          
          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div>
              <label htmlFor="name" className="block text-lg font-semibold text-purple-light mb-2">
                Ditt navn
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border-2 border-purple-primary bg-black-secondary px-4 py-3 text-orange-light placeholder:text-purple-secondary focus:border-orange-primary focus:outline-none"
                placeholder="Skriv inn navnet ditt"
                disabled={loading}
              />
            </div>

            <AvatarSelector 
              selectedAvatar={selectedAvatar} 
              onAvatarSelect={setSelectedAvatar} 
            />

            <div>
              <label className="block text-lg font-semibold text-purple-light mb-2">
                Velg ditt lag
              </label>
              {loadingGroups ? (
                <div className="rounded-xl border-2 border-purple-primary bg-black-secondary px-4 py-8 text-center text-purple-light">
                  Laster lag...
                </div>
              ) : groups.length === 0 ? (
                <div className="rounded-xl border-2 border-red-500 bg-red-500/20 px-4 py-3 text-red-200 text-sm">
                  Ingen lag tilgjengelig. Vennligst sjekk Supabase-tilkoblingen din.
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Team selected:', group.id, group.name);
                        setSelectedGroup(group.id);
                        setError(null); // Clear any previous errors
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      className={`w-full rounded-xl border-2 px-4 py-4 text-left transition-all cursor-pointer touch-manipulation ${
                        selectedGroup === group.id
                          ? 'border-orange-primary bg-orange-primary/20 text-orange-primary font-semibold'
                          : 'border-purple-primary bg-black-secondary text-purple-light hover:bg-purple-primary/10 active:bg-purple-primary/20'
                      }`}
                      disabled={loading}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <span className="flex items-center gap-2">
                        {selectedGroup === group.id && '✓ '}
                        {getTeamEmoji(group.name)} {translateTeamName(group.name)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/20 border border-red-500 px-4 py-3 text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !selectedGroup}
              className="h-14 w-full rounded-xl bg-orange-primary text-lg font-semibold text-black-primary transition-all hover:bg-orange-secondary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Bli med...' : 'Start Knask eller Knep'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

