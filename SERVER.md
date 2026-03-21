# Canopy — Analysis Server

Local Express server that analyzes TypeScript/JavaScript codebases. Built in the `analysis backend` commit.

## Running

```bash
cd server
npm run dev       # tsx watch (development)
npm run build && npm start  # production
```

The server auto-selects an available port and writes it to `.canopy/server.port` (relative to `server/`). Clients should read this file to discover the port.

## Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/analyze` | Trigger full pipeline — body: `{ workspacePath: string }` |
| GET | `/analyze-stream` | SSE progress stream — query: `?workspacePath=...` |
| GET | `/results` | Fetch `analysis.json` — query: `?workspacePath=...` |
| POST | `/apply-suggestion` | Returns diff preview, **no state mutation** |
| POST | `/mark-applied` | Marks suggestion applied, recalculates stats |
| POST | `/dismiss-suggestion` | Sets suggestion status to `"dismissed"` |

`workspacePath` must always be absolute. Returns 409 if analysis is already running for that workspace.

## Analysis Pipeline (8 steps)

1. **Static analysis** — `madge` dependency graph
2. **Git clustering** — `simple-git` co-change grouping
3. **Cluster merge** — union-find merge of steps 1+2
4. **Feature labeling** — Gemini (`gemini-1.5-flash`) names each cluster; falls back to directory name
5. **Complexity scoring** — LOC, deps, cyclomatic complexity via TS compiler API
6. **Sustainability scoring** — electricity / carbon estimates + tier classification + SCI score (`((E × I) + M) per R`, Green Software Foundation formula)
7. **Pattern detection** — Claude (`claude-sonnet-4-6`) finds inefficiency patterns
8. **Suggestion generation** — Claude generates greener code alternatives

## Output

Written to `{workspacePath}/.canopy/analysis.json`. All `filePath` values inside are **relative to `workspacePath`** — resolve with `path.join(workspacePath, filePath)`.

## SSE Events

Connect to `/analyze-stream` before or after POST `/analyze`. The server buffers events per workspace and replays them to late-connecting clients. Useful for the dashboard progress view.

## Config (`{workspacePath}/.canopy/config.json`)

Optional file that customizes SCI scoring. All fields have defaults and missing file is silently ignored.

| Field | Default | Description |
|-------|---------|-------------|
| `embodiedCarbonKg` | 1000 | Total embodied carbon of server hardware (kg CO2e) |
| `hardwareLifespanYears` | 4 | Expected hardware lifespan |
| `monthlyRequests` | 100000 | Baseline requests/month for the whole codebase |
| `functionalUnit` | `"per_1000_requests"` | `per_1000_requests` \| `per_daily_active_user` \| `per_transaction` |
| `functionalUnitLabel` | `"per 1000 API requests"` | Human-readable unit label in output |

## Environment

Requires `.env` with:
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
