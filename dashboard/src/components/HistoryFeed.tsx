import type { AnalysisResult } from '../lib/types'
import { PATTERN_LABELS } from '../lib/constants'

interface Props {
  history: AnalysisResult['history']
}

export default function HistoryFeed({ history }: Props) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  )

  const totalSciSaved = sorted.reduce((s, h) => s + (h.savingsSciGco2PerR ?? 0), 0)
  const totalElecSaved = sorted.reduce((s, h) => s + h.savingsElectricityKwh, 0)

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-canopy-muted text-sm">
        <div className="text-3xl mb-2">📜</div>
        <p>No history yet.</p>
        <p className="text-xs mt-1 text-canopy-muted/60 text-center px-4">
          Apply suggestions in the VS Code extension to see them here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Cumulative savings banner */}
      <div className="bg-canopy-accent/10 border border-canopy-accent/30 rounded-lg p-3">
        <p className="text-[9px] uppercase tracking-widest text-canopy-accent mb-1">
          Cumulative SCI Savings
        </p>
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-canopy-accent font-bold text-xl tabular-nums font-mono">
            ~{totalSciSaved.toFixed(1)}
          </span>
          <span className="text-canopy-muted text-[10px]">gCO₂/day saved</span>
        </div>
        <div className="text-[10px] text-canopy-muted">
          ~{totalElecSaved.toFixed(4)} kWh/mo energy saved
        </div>
        <div className="text-[9px] text-canopy-muted/50 mt-1">
          {sorted.length} suggestion{sorted.length !== 1 ? 's' : ''} applied
        </div>
      </div>

      {/* Timeline entries */}
      <div className="flex flex-col gap-2">
        {sorted.map((entry) => {
          const time = new Date(entry.appliedAt)
          const timeStr = time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          const dateStr = time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

          return (
            <div
              key={`${entry.suggestionId}-${entry.appliedAt}`}
              className="bg-canopy-card border border-canopy-border rounded-lg p-2.5 flex flex-col gap-1"
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-canopy-text leading-tight">{entry.featureName}</p>
                <span className="text-canopy-accent text-[10px] shrink-0 ml-2">applied</span>
              </div>
              <p className="text-[10px] text-canopy-muted">
                {PATTERN_LABELS[entry.patternType as keyof typeof PATTERN_LABELS] ?? entry.patternType}
              </p>
              {entry.savingsSciGco2PerR != null && (
                <div className="text-[10px] text-canopy-accent font-mono font-medium">
                  −{entry.savingsSciGco2PerR.toFixed(1)} gCO₂/day SCI
                </div>
              )}
              <p className="text-[9px] text-canopy-muted/50 font-mono">
                {dateStr} · {timeStr}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
