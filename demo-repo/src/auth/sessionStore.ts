import { db } from '../db/client';

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  createdAt: Date;
  expiresAt: Date;
}

export async function createSession(userId: string, refreshToken: string): Promise<Session> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const result = await db.query(
    `INSERT INTO sessions (user_id, refresh_token, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, refreshToken, expiresAt]
  );
  return result.rows[0];
}

export async function findSessionByToken(refreshToken: string): Promise<Session | null> {
  const result = await db.query(
    `SELECT * FROM sessions
     WHERE refresh_token = $1
       AND expires_at > NOW()`,
    [refreshToken]
  );
  return result.rows[0] ?? null;
}

export async function deleteSession(refreshToken: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}
