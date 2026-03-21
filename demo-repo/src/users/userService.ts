import { Pool } from 'pg';

const userDb = new Pool({ connectionString: process.env.USER_DB_URL });

interface User {
  id: string;
  name: string;
  email: string;
  teamId: string;
}

interface Team {
  id: string;
  name: string;
}

interface UserWithTeam extends User {
  teamName: string;
  teamMembers: User[];
}

// N+1 QUERY PATTERN: Fetches users then fires one DB query per user for their team.
// Results in 1 + N*2 queries. Should use a batched JOIN instead.
export async function getUsersWithTeamInfo(userIds: string[]): Promise<UserWithTeam[]> {
  const result = await userDb.query(
    'SELECT * FROM users WHERE id = ANY($1)',
    [userIds]
  );
  const users: User[] = result.rows;
  const usersWithTeams: UserWithTeam[] = [];

  for (const user of users) {
    // N+1: separate query per user for their team
    const teamResult = await userDb.query(
      'SELECT * FROM teams WHERE id = $1',
      [user.teamId]
    );
    const team: Team = teamResult.rows[0];

    // N+1: another separate query per user for team members
    const membersResult = await userDb.query(
      'SELECT * FROM users WHERE team_id = $1',
      [user.teamId]
    );

    usersWithTeams.push({
      ...user,
      teamName: team?.name || 'Unknown',
      teamMembers: membersResult.rows,
    });
  }

  return usersWithTeams;
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await userDb.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const result = await userDb.query(
    'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
    [data.name, data.email, id]
  );
  return result.rows[0];
}
