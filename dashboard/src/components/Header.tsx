import type { UseAnalysisReturn } from '../hooks/useAnalysis'

interface Props {
  ctx: UseAnalysisReturn
}

export default function Header({ ctx }: Props) {
  const { analysis, isAnalyzing, reanalyze } = ctx

  const lastUpdated = analysis
    ? new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(analysis.generatedAt))
    : null

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-canopy-border bg-canopy-surface flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-canopy-green font-bold text-lg tracking-tight">🌿 Canopy</span>
        {lastUpdated && (
          <span className="text-canopy-muted text-xs ml-2">Updated {lastUpdated}</span>
        )}
      </div>

      <button
        onClick={reanalyze}
        disabled={isAnalyzing}
        className="px-3 py-1.5 rounded text-xs font-medium border border-canopy-green/40 text-canopy-green
          hover:bg-canopy-green/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isAnalyzing ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 border border-canopy-green border-t-transparent rounded-full animate-spin" />
            Analyzing…
          </span>
        ) : (
          'Re-analyze'
        )}
      </button>
    </header>
  )
}
