# Canopy — VS Code Extension

## Running in Development

```bash
cd extension
npm install
npm run watch          # compile TS in watch mode
```

Then press **F5** in VS Code (with the extension directory open) to launch the Extension Development Host. Or use `--extensionDevelopmentPath` pointing to `extension/`.

The server must be built first:
```bash
cd server
npm install
npm run build
```

The extension spawns the server automatically on activation. Requires `server/.env` with `ANTHROPIC_API_KEY` and `GEMINI_API_KEY`.

## Architecture

### Extension host (src/)
TypeScript compiled to `out/`. Runs in VS Code's Node.js extension host process.

- **extension.ts** — `activate()` starts server, registers sidebar + commands, runs initial analysis. `deactivate()` kills server.
- **server.ts** — Spawns `node dist/index.js` in `server/` directory. Polls `server/.canopy/server.port` for port discovery. Health-checks existing port files before respawning.
- **api.ts** — Typed wrappers for all 6 backend endpoints. Uses native `fetch` for HTTP, `eventsource` npm package for SSE.
- **types.ts** — Copied from `server/src/types.ts`: `AnalysisResult`, `Feature`, `Suggestion`, `HistoryEntry`, `FileChange`.
- **sidebar.ts** — Flat `TreeDataProvider` listing features sorted by sustainability tier (high → medium → low). Shows electricity, carbon, and pending suggestion count.
- **graphPanel.ts** — Singleton WebviewPanel for D3 graph. Loads D3 from `node_modules/d3/dist/d3.min.js` via `asWebviewUri`.
- **diffPanel.ts** — WebviewPanel showing two-column code diff (current vs suggested) with Apply/Dismiss buttons.

### Webview scripts (webview/)
Plain JavaScript files that run inside VS Code webview `<iframe>`. They communicate with the extension host via `postMessage` / `onDidReceiveMessage`.

- **graph/graph.js** — D3 force-directed graph. Real nodes colored by tier, ghost nodes for pending suggestions.
- **diff/diff.js** — Button click handlers for Apply/Dismiss.

### Message protocol

**Extension → Graph webview:**
- `{ type: 'loadData', features }` — render graph with these features
- `{ type: 'focusNode', featureId }` — highlight a specific node
- `{ type: 'suggestionApplied', featureId, suggestionId }` — turn ghost node green
- `{ type: 'suggestionDismissed', featureId, suggestionId }` — fade out ghost node

**Graph webview → Extension:**
- `{ type: 'ghostNodeClicked', featureId, suggestionId }` — open diff panel
- `{ type: 'nodeSelected', featureId }` — focus sidebar

**Diff webview → Extension:**
- `{ type: 'apply' }` — apply suggestion to files
- `{ type: 'dismiss' }` — dismiss suggestion

## CSP Requirements

Every webview HTML must include a Content-Security-Policy meta tag with a nonce:
```
script-src 'nonce-{nonce}'; style-src {webview.cspSource};
```
All `<script>` tags must have `nonce="{nonce}"`. Without this, VS Code blocks script execution.

## Post-suggestion flow

After applying or dismissing a suggestion:
1. Call the server endpoint (`/mark-applied` or `/dismiss-suggestion`)
2. Fetch updated results via `GET /results` (instant — reads file)
3. Refresh sidebar with `sidebar.refresh(features)`
4. Notify graph webview via `postMessage`
5. **Do NOT trigger full re-analysis** — the server already updated stats in `analysis.json`

## Graph edge computation

Links between real feature nodes are derived from shared files in the `features[].files` arrays. If two features share any file, they are linked. Ghost nodes are always linked only to their parent feature.
