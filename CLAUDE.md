# Canopy — Backend Server

## What this is
Local Node.js/Express analysis server for the Canopy VS Code extension and web dashboard.
Analyzes TypeScript/JavaScript codebases: segments them into features, scores complexity,
estimates sustainability impact (electricity, carbon), and detects inefficiency patterns
with AI-generated greener alternatives.

## File structure
server/
├── src/
│   ├── index.ts                  # Entry point: port discovery, server start, port file lifecycle
│   ├── app.ts                    # Express app factory: middleware, route mounting
│   ├── types.ts                  # All shared TypeScript interfaces
│   ├── routes/
│   │   ├── analyze.ts            # POST /analyze + GET /analyze-stream
│   │   └── results.ts            # GET /results, POST /apply-suggestion, /mark-applied, /dismiss-suggestion
│   ├── pipeline/
│   │   ├── runner.ts             # Orchestrates all 8 steps, emits SSE events
│   │   ├── staticAnalysis.ts     # Step 1: madge dependency graph
│   │   ├── gitClustering.ts      # Step 2: simple-git co-change analysis
│   │   ├── clusterMerge.ts       # Step 3: union-find merge
│   │   ├── featureLabeling.ts    # Step 4: Gemini labeling + directory fallback
│   │   ├── complexityScoring.ts  # Step 5: LOC, deps, cyclomatic via TS compiler API
│   │   ├── sustainability.ts     # Step 6: electricity/carbon formulas + tiers + SCI score
│   │   └── patternDetection.ts   # Steps 7+8: Claude pattern detection + suggestion generation
│   ├── llm/
│   │   ├── gemini.ts             # Gemini client wrapper (used for Step 4 only)
│   │   └── claude.ts             # Claude client wrapper (used for Steps 7 and 8)
│   └── utils/
│       ├── retry.ts              # Exponential backoff retry (3 attempts, 1s/2s/4s)
│       ├── sse.ts                # SSE client set + event buffering/replay
│       └── unionFind.ts          # Union-Find data structure

## Dual LLM split
- Step 4 (feature labeling): Gemini API — gemini-1.5-flash via @google/generative-ai
- Step 7 (pattern detection): Claude API — claude-sonnet-4-6 via @anthropic-ai/sdk
- Step 8 (suggestion generation): Claude API — claude-sonnet-4-6 via @anthropic-ai/sdk
- All other steps: no LLM

## Endpoints
- POST /analyze — triggers full pipeline, accepts { workspacePath: string }
- GET /analyze-stream?workspacePath=/absolute/path/to/workspace — SSE stream for progress events
- GET /results?workspacePath=/absolute/path/to/workspace — returns current .canopy/analysis.json
- POST /apply-suggestion — returns file diffs, does NOT mutate state
- POST /mark-applied — mutates state: updates status, recalculates stats, appends history
- POST /dismiss-suggestion — sets suggestion status to "dismissed"

## workspacePath rules
- Always absolute (path.isAbsolute check enforced server-side)
- Passed in POST /analyze body and in all results endpoint bodies/query params
- .canopy/analysis.json is written to {workspacePath}/.canopy/analysis.json
- .canopy/server.port is written to {process.cwd()}/.canopy/server.port

## File path convention
All filePath values in analysis.json are relative to workspacePath.
Consumers must resolve them with path.join(workspacePath, filePath).

## SCI scoring (Step 6)
`sustainability.ts` reads optional config from `{workspacePath}/.canopy/config.json`:
- `embodiedCarbonKg` (default 1000), `hardwareLifespanYears` (default 4)
- `monthlyRequests` (default 100,000), `functionalUnit`, `functionalUnitLabel`

SCI formula: `((E × I) + M) per R` where I = 436 gCO2/kWh (IEA global average), R = per 1000 API requests by default.
Each feature's `sustainability.sci` block includes `score`, `unit`, `components` (E_per_R, I, M_per_R), and `functionalUnit`.
`totals.sci` holds `averageScore`, `highestFeature`, and `unit`.
`POST /mark-applied` reduces `sci.score` and `sci.components.E_per_R` by the same `estimatedSavingsPercent` and updates `totals.sci.averageScore`.

## Key constraints
- workspacePath always comes from POST /analyze request body, never from process.argv
- Concurrency: POST /analyze returns 409 if analysis already running for that workspace
- SSE: buffer events per workspace and replay to late-connecting clients

---

# Canopy — VS Code Extension

## What this is
VS Code extension that spawns the backend server, shows analysis results in a sidebar,
renders a D3 force graph with ghost suggestion nodes, and provides a diff preview panel
for applying or dismissing green code suggestions.

## File structure
extension/
├── package.json               # Extension manifest + dependencies
├── tsconfig.json
├── assets/
│   └── canopy-icon.svg        # Activity bar icon
├── src/
│   ├── extension.ts           # Entry point: activate() / deactivate()
│   ├── server.ts              # Server lifecycle: spawn, port discovery, health check
│   ├── api.ts                 # All HTTP calls to the backend
│   ├── types.ts               # Shared TypeScript interfaces (copied from server)
│   ├── sidebar.ts             # WebviewViewProvider for sidebar (accepts baseUrl + workspacePath)
│   ├── graphPanel.ts          # WebviewPanel wrapper for D3 graph
│   └── diffPanel.ts           # WebviewPanel wrapper for diff preview
└── webview/
    ├── graph/
    │   ├── graph.js           # D3 force graph logic (plain JS, runs in webview)
    │   └── styles.css
    ├── sidebar/
    │   ├── sidebar.js         # Sidebar UI: welcome/analyzing/ready/error states + dashboard button
    │   └── styles.css
    └── diff/
        ├── diff.js            # Diff panel button handlers (plain JS, runs in webview)
        └── styles.css

## Activation flow
1. Check workspace is open
2. Start server via ensureServerRunning() — spawns node dist/index.js in server/ dir
3. Register sidebar WebviewViewProvider for canopy.features view
4. Register commands: canopy.openGraph, canopy.reanalyze, canopy.openDashboard
5. Run initial analysis with SSE progress tracking
6. Watch file saves with 30s debounce for "outdated" nudge

## Commands
- canopy.openGraph — opens D3 graph in beside panel
- canopy.reanalyze — re-runs full analysis pipeline
- canopy.openDashboard — opens CanopyDashboardPanel (VS Code webview panel)

## Sidebar dashboard button
The sidebar renders an "Open Dashboard" button at the top in `ready` and `error` states (not in `welcome` or `analyzing`). The button posts `{ type: 'openDashboard' }` to the extension host, which calls `vscode.env.openExternal` to open `{baseUrl}/dashboard?workspacePath=...` in the browser. This is handled in `sidebar.ts`'s `onDidReceiveMessage` — distinct from the `canopy.openDashboard` command which opens the in-editor panel.

## Key architectural decisions
- Webview scripts are plain JS (no separate TS compilation for webviews)
- D3 loaded from node_modules via asWebviewUri, never CDN
- EventSource polyfill (eventsource npm package) used for SSE in Node.js extension host
- After applying/dismissing suggestions: fetch updated results, refresh sidebar + graph — no full re-analysis
- Server CWD must be server/ dir so port file lands at server/.canopy/server.port
- CSP nonce required on all webview script tags
