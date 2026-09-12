import { neon } from '@neondatabase/serverless';

const connectionString =
  (import.meta.env["VITE_NEON_DATABASE_URL"] as string | undefined) ||
  'postgresql://neondb_owner:npg_0vWTAN8wHfmn@ep-old-wildflower-ax6z5fx4-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require';

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
export async function recordWinToLeaderboard(
  fishName: string,
  recordTime: number,
  eventName = '100m Swimming',
  customMedal?: 'gold' | 'silver' | 'bronze'
) {
  try {
    const medal = customMedal || (recordTime <= 15 ? 'gold' : recordTime <= 18 ? 'silver' : 'bronze');
    const result = await sql`
      INSERT INTO leaderboard (fish_name, record_time, event_name, medal)
      VALUES (${fishName}, ${recordTime}, ${eventName}, ${medal})
      RETURNING *;
    `;
    return result[0] || null;
  } catch (err) {
    console.warn('Neon recordWinToLeaderboard error:', err);
    return null;
  }
}

// --------------------------------------------------------
// 1. FISH IQ TEST
// --------------------------------------------------------
export interface FishIQRecord {
  id?: string;
  fishName: string;
  iqScore: number;
  grade: string;
  waterReflexes: number;
  hookAvoidance: number;
  glassResilience: string;
  coachNote: string;
  createdAt?: string;
}

export async function saveFishIQRecord(record: FishIQRecord) {
  try {
    const result = await sql`
      INSERT INTO fish_iq_records (fish_name, iq_score, grade, water_reflexes, hook_avoidance, glass_resilience, coach_note)
      VALUES (${record.fishName}, ${record.iqScore}, ${record.grade}, ${record.waterReflexes}, ${record.hookAvoidance}, ${record.glassResilience}, ${record.coachNote})
      RETURNING *;
    `;
    return result[0] || null;
  } catch (err) {
    console.warn('Neon saveFishIQRecord error:', err);
    return null;
  }
}

export async function getTopFishIQRecords(limit = 10): Promise<any[]> {
  try {
    const rows = await sql`
      SELECT * FROM fish_iq_records
      ORDER BY iq_score DESC, created_at DESC
      LIMIT ${limit};
    `;
    return rows;
  } catch (err) {
    console.warn('Neon getTopFishIQRecords error:', err);
    return [];
  }
}

// --------------------------------------------------------
// 2. TRAINING PROGRESSION
// --------------------------------------------------------
export async function saveTrainingProgress(fishName: string, levelId: string, levelName: string) {
  try {
    const result = await sql`
      INSERT INTO training_progress (fish_name, level_id, level_name, completed, updated_at)
      VALUES (${fishName}, ${levelId}, ${levelName}, true, NOW())
      ON CONFLICT (fish_name, level_id)
      DO UPDATE SET completed = true, updated_at = NOW()
      RETURNING *;
    `;
    return result[0] || null;
  } catch (err) {
    console.warn('Neon saveTrainingProgress error:', err);
    return null;
  }
}

export async function getTrainingProgress(fishName = 'Meemee'): Promise<Record<string, boolean>> {
  try {
    const rows = await sql`
      SELECT level_id, completed FROM training_progress
      WHERE fish_name = ${fishName};
    `;
    const map: Record<string, boolean> = {};
    for (const r of rows) {
      if (r['completed']) map[r['level_id']] = true;
    }
    return map;
  } catch (err) {
    console.warn('Neon getTrainingProgress error:', err);
    return {};
  }
}

// --------------------------------------------------------
// 3. GRADUATION CERTIFICATES
// --------------------------------------------------------
export interface CertificateRecord {
  id?: string;
  certificateCode: string;
  fishName: string;
  score: number;
  programName: string;
  instructor: string;
  createdAt?: string;
}

export async function issueCertificate(data: {
  fishName: string;
  score: number;
  programName?: string;
  instructor?: string;
}) {
  try {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `MEE-2026-${randomSuffix}`;
    const result = await sql`
      INSERT INTO certificates (certificate_code, fish_name, score, program_name, instructor)
      VALUES (${code}, ${data.fishName}, ${data.score}, ${data.programName || 'The Advanced Fish Swimming Program'}, ${data.instructor || 'Coach Fin'})
      RETURNING *;
    `;
    return result[0] || null;
  } catch (err) {
    console.warn('Neon issueCertificate error:', err);
    return null;
  }
}

export async function verifyCertificate(certificateCode: string): Promise<any | null> {
  try {
    const rows = await sql`
      SELECT * FROM certificates
      WHERE UPPER(certificate_code) = UPPER(${certificateCode.trim()})
      LIMIT 1;
    `;
    return rows[0] || null;
  } catch (err) {
    console.warn('Neon verifyCertificate error:', err);
    return null;
  }
}

export async function getLatestCertificate(fishName = 'Meemee'): Promise<any | null> {
  try {
    const rows = await sql`
      SELECT * FROM certificates
      WHERE fish_name = ${fishName}
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    return rows[0] || null;
  } catch (err) {
    console.warn('Neon getLatestCertificate error:', err);
    return null;
  }
}

