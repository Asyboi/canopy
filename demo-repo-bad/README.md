# demo-repo-bad

Intentionally inefficient TypeScript codebase for Canopy SCI demo.

This repo is designed to give Canopy high-confidence pattern detections,
compelling before/after diffs, and meaningful SCI score improvements.

## Setup

```bash
npm install
```

## Run benchmarks

```bash
npm run bench:reports      # sync blocking I/O — 20 reports
npm run bench:users        # N+1 queries — 10 aggregation runs
npm run bench:analytics    # no-cache recompute — 50 feed generations
npm run bench:export       # memory buffering — 5 export jobs
npm run bench:notifications  # aggressive polling — 5 second demo
npm run bench:all          # runs all except notifications
```

---

## Anti-patterns

### 1. Notifications — Aggressive Polling
**File:** `src/notifications/notificationPoller.ts`
**R:** one polling cycle (fires every 500ms)

**What it does:**
Polls for unread notifications every 500ms regardless of activity.
Re-reads and re-parses the full dataset from disk on every cycle.
Uses JSON.stringify for change detection instead of comparing IDs.

**Why it's inefficient:**
At 500ms interval: 120 disk reads/min per user.
Scales linearly with users — 100 users = 12,000 disk reads/min.
99% of polls find no change and do nothing useful.

**Greener rewrite Canopy should suggest:**
Replace setInterval polling with Server-Sent Events (SSE).
Server emits only when a new notification exists.
Eliminates ~99% of polling cycles under normal usage.

---

### 2. Reports — Sync Blocking File I/O
**File:** `src/reports/reportGenerator.ts`
**R:** one report generation job

**What it does:**
Re-reads the template JSON file from disk on every single report.
Uses `fs.readFileSync` — blocks the Node.js event loop during I/O.
Reads the output file back after writing to "verify" — pointless.

**Why it's inefficient:**
Blocks all other work during each read/write.
Template never changes — re-reading it is pure waste.
Read-back verification is redundant and doubles I/O cost.

**Greener rewrite Canopy should suggest:**
Load template once at startup, cache in module scope.
Replace readFileSync/writeFileSync with fs.promises equivalents.
Remove the read-back verification step.

---

### 3. Users — N+1 Queries
**File:** `src/users/userAggregator.ts`
**R:** one getUsersWithTeams() invocation

**What it does:**
Loads all users, then for each user does a separate team lookup,
then for each team member does another separate user lookup.
30 users × (1 team lookup + 3 member lookups) = ~120 individual reads.

**Why it's inefficient:**
O(n²) read complexity scales badly with user count.
Each lookup reloads and re-parses the full data file.
A single pass with pre-built maps would need 2 reads total.

**Greener rewrite Canopy should suggest:**
Load users once, load teams once.
Build a `teamId → team` map and a `userId → user` map.
Construct the full response in a single O(n) pass.

---

### 4. Analytics — Repeated Recomputation, No Cache
**File:** `src/analytics/feedGenerator.ts`
**R:** one feed generation request

**What it does:**
Recomputes trending scores from scratch on every request.
Uses O(n²) scoring: full array scan per notification.
Deep-clones the dataset via JSON.stringify/parse mid-computation.

**Why it's inefficient:**
At 100 requests/min the CPU is always at max for this module.
The result is identical between requests when data hasn't changed.
Deep clone via JSON round-trip is slow and memory-heavy.

**Greener rewrite Canopy should suggest:**
Cache the computed feed in memory with a short TTL.
Invalidate cache only when underlying data changes.
Replace JSON deep clone with structuredClone or a direct copy.
Pre-compute and store trending scores, update incrementally on writes.

---

### 5. Export — Memory Buffering Instead of Streaming
**File:** `src/export/dataExporter.ts`
**R:** one export batch job

**What it does:**
Loads all users and all notifications into RAM simultaneously.
Builds the entire CSV as one giant in-memory string before writing.
Re-reads the output file after writing to count lines.

**Why it's inefficient:**
Peak RAM = full users array + full notifications array + full CSV string.
No data is written until everything is processed — high latency.
Read-back verification doubles I/O cost and holds the buffer in memory longer.

**Greener rewrite Canopy should suggest:**
Use fs.createWriteStream with a pipeline.
Process users in chunks, write each chunk immediately.
Drop the read-back verification — trust the write or use checksums.
