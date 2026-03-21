# Canopy — Backend Server

## What this is
Local Node.js/Express analysis server for the Canopy VS Code extension and web dashboard.
Analyzes TypeScript/JavaScript codebases: segments them into features, scores complexity,
estimates sustainability impact (electricity, water, carbon), and detects inefficiency patterns
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
│   │   ├── sustainability.ts     # Step 6: electricity/water/carbon formulas + tiers
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

## Key constraints
- workspacePath always comes from POST /analyze request body, never from process.argv
- Concurrency: POST /analyze returns 409 if analysis already running for that workspace
- SSE: buffer events per workspace and replay to late-connecting clients
