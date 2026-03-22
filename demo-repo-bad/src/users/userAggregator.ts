import fs from 'fs';
import path from 'path';

// BAD PATTERN: N+1 QUERIES
// Functional Unit R: one getUsersWithTeams() invocation
//
// This module loads user data and then, for EACH user, performs two
// separate synchronous lookups:
//   1. Load the team record for that user's teamId
//   2. Load each team member's user record one-by-one
//
// For 30 users across 10 teams this causes:
//   30 (user lookups) + 30 (team lookups) + ~90 (member lookups) = ~150 reads
// A single batched join would need only 3 reads (users, teams, members map).
//
// Greener alternative:
//   Load users once, load teams once, build a teamId→team map,
//   then construct the response in a single pass — O(n) instead of O(n²).

const USERS_PATH = path.join(__dirname, '../../data/users.json');
const TEAMS_PATH = path.join(__dirname, '../../data/teams.json');

interface User {
  id: string;
  name: string;
  email: string;
  teamId: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  department: string;
  memberIds: string[];
}

// BAD: reloads and re-parses the entire users file on every call
function getAllUsers(): User[] {
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8')) as User[];
}

// BAD: reloads and re-parses the entire teams file on every call
function getAllTeams(): Team[] {
  return JSON.parse(fs.readFileSync(TEAMS_PATH, 'utf-8')) as Team[];
}

// BAD: finds a team by scanning the full array on every individual lookup
function findTeamById(teamId: string): Team | undefined {
  // BAD: re-reads and re-parses teams from disk on every individual lookup
  const teams = getAllTeams();
  return teams.find(t => t.id === teamId);
}

// BAD: finds a user by scanning the full array on every individual lookup
function findUserById(userId: string): User | undefined {
  // BAD: re-reads and re-parses users from disk on every individual lookup
  const users = getAllUsers();
  return users.find(u => u.id === userId);
}

interface UserWithTeam extends User {
  team: (Team & { members: User[] }) | null;
}

function getUsersWithTeams(): UserWithTeam[] {
  // Initial load of all users
  const users = getAllUsers();

  // BAD: N+1 — for each user, do a separate team lookup
  return users.map(user => {
    // BAD: separate disk read + parse + linear scan per user
    const team = findTeamById(user.teamId);

    if (!team) return { ...user, team: null };

    // BAD: N+1 again — for each team member, do a separate user lookup
    const members = team.memberIds.map(memberId => {
      // BAD: another separate disk read + parse + linear scan per member
      return findUserById(memberId) ?? null;
    }).filter((m): m is User => m !== null);

    return {
      ...user,
      team: { ...team, members },
    };
  });
}

export { getUsersWithTeams };
