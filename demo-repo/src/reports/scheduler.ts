import { generateWeeklyReport } from './index';

interface ScheduledJob {
  teamId: string;
  intervalMs: number;
  handle: ReturnType<typeof setInterval>;
}

const jobs = new Map<string, ScheduledJob>();

export function scheduleWeeklyReport(teamId: string): void {
  if (jobs.has(teamId)) {
    console.log(`[scheduler] report job already running for team=${teamId}`);
    return;
  }

  // Run immediately, then on the interval
  void runJob(teamId);

  const handle = setInterval(() => void runJob(teamId), 7 * 24 * 60 * 60 * 1000);

  jobs.set(teamId, { teamId, intervalMs: 7 * 24 * 60 * 60 * 1000, handle });
  console.log(`[scheduler] weekly report scheduled for team=${teamId}`);
}

export function cancelSchedule(teamId: string): void {
  const job = jobs.get(teamId);
  if (job) {
    clearInterval(job.handle);
    jobs.delete(teamId);
    console.log(`[scheduler] cancelled report job for team=${teamId}`);
  }
}

export function listScheduledTeams(): string[] {
  return Array.from(jobs.keys());
}

async function runJob(teamId: string): Promise<void> {
  try {
    const filepath = await generateWeeklyReport(teamId);
    console.log(`[scheduler] generated report for team=${teamId} → ${filepath}`);
  } catch (err) {
    console.error(`[scheduler] report failed for team=${teamId}:`, err);
  }
}
