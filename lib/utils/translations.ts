/**
 * Translation utilities for team names
 * Handles both English and Norwegian team names
 */

export function translateTeamName(teamName: string): string {
  const translations: Record<string, string> = {
    'Team Pumpkin': 'Lag Gresskar',
    'Team Ghost': 'Lag Spøkelse',
    'Lag Gresskar': 'Lag Gresskar',
    'Lag Spøkelse': 'Lag Spøkelse',
  };
  
  return translations[teamName] || teamName;
}

export function getTeamEmoji(teamName: string): string {
  if (teamName === 'Team Pumpkin' || teamName === 'Lag Gresskar') {
    return '🎃';
  }
  if (teamName === 'Team Ghost' || teamName === 'Lag Spøkelse') {
    return '👻';
  }
  return '👥';
}

