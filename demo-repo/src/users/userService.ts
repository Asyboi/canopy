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

// BATCHED QUERY PATTERN: Replaces the previous 1 + N*2 query pattern with 3 total queries.
// First fetches all users, then fetches all relevant teams and team members in single
// batched queries using WHERE IN / ANY, and finally assembles the result in memory.
export async function getUsersWithTeamInfo(userIds: string[]): Promise<UserWithTeam[]> {
  const result = await userDb.query(
    'SELECT * FROM users WHERE id = ANY($1)',
    [userIds]
  );
  const users: User[] = result.rows;

  if (users.length === 0) {
    return [];
  }

  // Collect unique team IDs to avoid redundant lookups
  const teamIds = [...new Set(users.map((user) => user.teamId))];

  // Batch-fetch all relevant teams and members in parallel — one query each
  const [teamsResult, membersResult] = await Promise.all([
    userDb.query(
      'SELECT * FROM teams WHERE id = ANY($1)',
      [teamIds]
    ),
    userDb.query(
      'SELECT * FROM users WHERE team_id = ANY($1)',
      [teamIds]
    ),
  ]);

  const teamsById = new Map<string, Team>(
    teamsResult.rows.map((team: Team) => [team.id, team])
  );

  const membersByTeamId = new Map<string, User[]>();
  for (const member of membersResult.rows as User[]) {
    const existing = membersByTeamId.get(member.teamId) ?? [];
    existing.push(member);
    membersByTeamId.set(member.teamId, existing);
  }

  // Assemble final result using the in-memory maps — no further DB calls needed
  const usersWithTeams: UserWithTeam[] = users.map((user) => ({
    ...user,
    teamName: teamsById.get(user.teamId)?.name || 'Unknown',
    teamMembers: membersByTeamId.get(user.teamId) ?? [],
  }));

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