import { neon } from '@neondatabase/serverless';

const connectionString =
  (import.meta.env["VITE_NEON_DATABASE_URL"] as string | undefined) ||
  'postgresql://neondb_owner:npg_2WOBIePvM5hu@ep-cold-forest-axt8eeee-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

export const sql = neon(connectionString);

export interface RaceMatchRecord {
  id?: string;
  roomCode: string;
  player1Name: string;
  player2Name: string;
  winnerName: string;
  durationSeconds: number;
  createdAt?: string;
}

export interface LeaderboardEntry {
  id: string;
  fish_name: string;
  record_time: string | number;
  event_name: string;
  medal: 'gold' | 'silver' | 'bronze';
  created_at: string;
}

// Save completed 2-player race match into Neon
export async function saveRaceMatch(record: RaceMatchRecord) {
  try {
    const result = await sql`
      INSERT INTO race_matches (room_code, player1_name, player2_name, winner_name, duration_seconds)
      VALUES (${record.roomCode}, ${record.player1Name}, ${record.player2Name}, ${record.winnerName}, ${record.durationSeconds})
      RETURNING *;
    `;
    return result[0] || null;
  } catch (err) {
    console.warn('Neon saveRaceMatch error:', err);
    return null;
  }
}

// Fetch recent 2-player matches from Neon
export async function getRecentRaceMatches(limit = 10): Promise<any[]> {
  try {
    const rows = await sql`
      SELECT * FROM race_matches
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
    return rows;
  } catch (err) {
    console.warn('Neon getRecentRaceMatches error:', err);
    return [];
  }
}

// Fetch global leaderboard from Neon
export async function getLeaderboard(limit = 15): Promise<LeaderboardEntry[]> {
  try {
    const rows = await sql`
      SELECT * FROM leaderboard
      ORDER BY record_time ASC
      LIMIT ${limit};
    `;
    return rows as LeaderboardEntry[];
  } catch (err) {
    console.warn('Neon getLeaderboard error:', err);
    return [];
  }
}

// Add or update leaderboard score
export async function recordWinToLeaderboard(fishName: string, recordTime: number) {
  try {
    const medal = recordTime <= 15 ? 'gold' : recordTime <= 18 ? 'silver' : 'bronze';
    const result = await sql`
      INSERT INTO leaderboard (fish_name, record_time, event_name, medal)
      VALUES (${fishName}, ${recordTime}, '100m Swimming', ${medal})
      RETURNING *;
    `;
    return result[0] || null;
  } catch (err) {
    console.warn('Neon recordWinToLeaderboard error:', err);
    return null;
  }
}
