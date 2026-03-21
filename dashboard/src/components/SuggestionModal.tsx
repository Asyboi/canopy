import { useEffect } from 'react'
import type { AnalysisResult } from '../lib/types'
import type { PendingDiff } from '../hooks/useAnalysis'
import { PATTERN_LABELS } from '../lib/constants'

interface Props {
  analysis: AnalysisResult
  pendingDiff: PendingDiff
  onConfirm: () => Promise<void>
  onCancel: () => void
}

function DiffPane({ label, code }: { label: string; code: string }) {
  return (
    <div className="flex flex-col flex-1 min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-canopy-muted px-3 py-2 border-b border-canopy-border">
        {label}
      </div>
      <pre className="flex-1 overflow-auto text-[11px] p-3 text-canopy-text leading-relaxed font-mono whitespace-pre-wrap break-words">
        {code}
      </pre>
    </div>
  )
}

export default function SuggestionModal({ analysis, pendingDiff, onConfirm, onCancel }: Props) {
  const { featureId, suggestionId, diff } = pendingDiff

  const feature = analysis.features.find((f) => f.id === featureId)
  const suggestion = feature?.suggestions.find((s) => s.id === suggestionId)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  if (!feature || !suggestion) return null

  const afterCode = diff.files[0]?.newContent ?? ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
    >
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col bg-canopy-surface border border-canopy-border rounded-xl shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-canopy-border flex-shrink-0">
          <div>
            <p className="text-sm font-semibold text-canopy-text">
              {feature.name}
            </p>
            <p className="text-[11px] text-canopy-muted mt-0.5">
              {PATTERN_LABELS[suggestion.patternType]} ·{' '}
              <span className="text-canopy-green">
                est. -{suggestion.estimatedSavingsPercent}% impact
              </span>
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-canopy-muted hover:text-canopy-text text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Explanation */}
        <div className="px-4 py-2.5 border-b border-canopy-border bg-canopy-card/50 flex-shrink-0">
          <p className="text-[11px] text-canopy-muted leading-relaxed">{suggestion.explanation}</p>
        </div>

        {/* Diff panes */}
        <div className="flex flex-1 min-h-0 divide-x divide-canopy-border overflow-hidden">
          <DiffPane label="Current" code={suggestion.currentCode} />
          <DiffPane label="Greener version" code={afterCode} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-canopy-border flex-shrink-0 bg-canopy-surface">
          <p className="text-[11px] text-canopy-muted">
            This change is estimated to reduce operational impact by{' '}
            <span className="text-canopy-green font-medium">
              {suggestion.estimatedSavingsPercent}%
            </span>{' '}
            under current assumptions.
          </p>
          <div className="flex gap-2 ml-4">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded text-xs border border-canopy-border text-canopy-muted
                hover:border-canopy-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 rounded text-xs font-medium bg-canopy-green text-canopy-bg
                hover:bg-canopy-green-dark transition-colors"
            >
              Confirm Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
