import type { AnalysisResult } from '../lib/types'

interface Props {
  ctx: {
    analysis: AnalysisResult | null
    isAnalyzing: boolean
    reanalyze: () => Promise<void>
    workspacePath: string | null
  }
}

export default function Header({ ctx }: Props) {
  const { analysis, isAnalyzing, reanalyze, workspacePath } = ctx

  const workspaceName = workspacePath
    ? workspacePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? workspacePath
    : null

  const lastUpdated = analysis
    ? new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(analysis.generatedAt))
    : null

  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-canopy-border bg-canopy-surface flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-canopy-accent font-bold text-base tracking-tight font-mono">🌿 Canopy</span>
        {workspaceName && (
          <span className="text-canopy-muted text-xs font-mono bg-canopy-card border border-canopy-border rounded px-1.5 py-0.5">
            {workspaceName}
          </span>
        )}
        {lastUpdated && (
          <span className="text-canopy-muted/60 text-[10px]">Updated {lastUpdated}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Status badge */}
        {isAnalyzing ? (
          <span className="text-[10px] text-canopy-accent/80 bg-canopy-accent/10 border border-canopy-accent/20 rounded px-2 py-0.5">
            Analyzing…
          </span>
        ) : analysis ? (
          <span className="text-[10px] text-canopy-muted/60 bg-canopy-card border border-canopy-border rounded px-2 py-0.5">
            Estimated · SCI-lite
          </span>
        ) : null}

        <button
          onClick={reanalyze}
          disabled={isAnalyzing}
          className="px-3 py-1.5 rounded text-xs font-medium border border-canopy-accent/40 text-canopy-accent
            hover:bg-canopy-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border border-canopy-accent border-t-transparent rounded-full animate-spin" />
              Analyzing…
            </span>
          ) : (
            'Re-analyze'
          )}
        </button>
      </div>
    </header>
  )
}
