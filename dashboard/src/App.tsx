import { useAnalysis } from './hooks/useAnalysis'
import Header from './components/Header'
import StatCards from './components/StatCards'
import FeatureList from './components/FeatureList'
import GraphPanel from './components/GraphPanel'
import SuggestionsPanel from './components/SuggestionsPanel'
import SuggestionModal from './components/SuggestionModal'

export default function App() {
  const ctx = useAnalysis()
  const { analysis, loading, error, consecutiveFailures, pendingDiff } = ctx

  return (
    <div className="min-h-screen flex flex-col bg-canopy-bg text-canopy-text">
      <Header ctx={ctx} />

      {/* Connection lost banner */}
      {consecutiveFailures >= 3 && (
        <div className="bg-red-900/40 border-b border-red-700/50 px-4 py-2 text-sm text-red-300 text-center">
          Connection lost — retrying…
        </div>
      )}

      {/* No workspacePath warning */}
      {!ctx.workspacePath && (
        <div className="flex flex-1 items-center justify-center text-canopy-muted text-sm">
          <div className="text-center">
            <div className="text-4xl mb-3">🌿</div>
            <p>No workspace path provided.</p>
            <p className="mt-1 text-xs">
              Open this dashboard with{' '}
              <code className="bg-canopy-card px-1 rounded">?workspacePath=/path/to/project</code>
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {ctx.workspacePath && loading && (
        <div className="flex flex-1 items-center justify-center text-canopy-muted text-sm">
          <div className="text-center">
            <div className="animate-pulse text-canopy-green text-4xl mb-3">🌿</div>
            <p>Loading analysis…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {ctx.workspacePath && !loading && error && !analysis && (
        <div className="flex flex-1 items-center justify-center text-canopy-muted text-sm">
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-red-400">{error}</p>
            <p className="mt-2 text-xs">Make sure the Canopy server is running.</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {ctx.workspacePath && !loading && !error && !analysis && (
        <div className="flex flex-1 items-center justify-center text-canopy-muted text-sm">
          <div className="text-center">
            <div className="text-4xl mb-3">🌱</div>
            <p>No analysis yet.</p>
            <p className="mt-1 text-xs">Click "Re-analyze" to scan your workspace.</p>
          </div>
        </div>
      )}

      {/* Main layout */}
      {ctx.workspacePath && analysis && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left column */}
          <div className="w-64 flex-shrink-0 flex flex-col overflow-y-auto border-r border-canopy-border p-3 gap-3">
            <StatCards totals={analysis.totals} />
            <FeatureList features={analysis.features} />
          </div>

          {/* Center: graph */}
          <div className="flex-1 overflow-hidden">
            <GraphPanel analysis={analysis} onOpenDiff={ctx.openDiff} />
          </div>

          {/* Right column */}
          <div className="w-72 flex-shrink-0 flex flex-col overflow-y-auto border-l border-canopy-border">
            <SuggestionsPanel
              analysis={analysis}
              onOpenDiff={ctx.openDiff}
              onDismiss={ctx.dismiss}
            />
          </div>
        </div>
      )}

      {/* Modal */}
      {pendingDiff && analysis && (
        <SuggestionModal
          analysis={analysis}
          pendingDiff={pendingDiff}
          onConfirm={ctx.confirmApply}
          onCancel={ctx.cancelDiff}
        />
      )}
    </div>
  )
}
