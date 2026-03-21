import { useState } from 'react'
import type { AnalysisResult, Feature, Suggestion } from '../lib/types'
import { PATTERN_LABELS } from '../lib/constants'

interface Props {
  analysis: AnalysisResult
  onOpenDiff: (featureId: string, suggestionId: string) => Promise<void>
  onDismiss: (featureId: string, suggestionId: string) => Promise<void>
}

type Tab = 'pending' | 'history'

function SuggestionCard({
  suggestion,
  feature,
  onOpenDiff,
  onDismiss,
}: {
  suggestion: Suggestion
  feature: Feature
  onOpenDiff: () => void
  onDismiss: () => void
}) {
  const [applying, setApplying] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  return (
    <div className="bg-canopy-card border border-canopy-border rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-1">
        <div>
          <p className="text-xs font-medium text-canopy-text leading-tight">{feature.name}</p>
          <p className="text-[10px] text-canopy-muted mt-0.5">
            {PATTERN_LABELS[suggestion.patternType]}
          </p>
        </div>
        <span className="text-canopy-green text-xs font-semibold shrink-0">
          -{suggestion.estimatedSavingsPercent}%
        </span>
      </div>

      <p className="text-[11px] text-canopy-muted leading-relaxed line-clamp-3">
        {suggestion.explanation}
      </p>

      <div className="flex gap-1.5 mt-0.5">
        <button
          onClick={async () => {
            setApplying(true)
            await onOpenDiff()
            setApplying(false)
          }}
          disabled={applying || dismissing}
          className="flex-1 py-1 rounded text-[11px] font-medium bg-canopy-green/10 border border-canopy-green/30
            text-canopy-green hover:bg-canopy-green/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {applying ? 'Loading…' : 'Apply'}
        </button>
        <button
          onClick={async () => {
            setDismissing(true)
            await onDismiss()
          }}
          disabled={applying || dismissing}
          className="flex-1 py-1 rounded text-[11px] font-medium border border-canopy-border
            text-canopy-muted hover:border-canopy-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {dismissing ? '…' : 'Dismiss'}
        </button>
      </div>
    </div>
  )
}

function PendingTab({
  analysis,
  onOpenDiff,
  onDismiss,
}: Props) {
  // Flatten all pending suggestions with their parent feature
  const pending: { feature: Feature; suggestion: Suggestion }[] = []
  for (const feature of analysis.features) {
    for (const s of feature.suggestions) {
      if (s.status === 'suggested') {
        pending.push({ feature, suggestion: s })
      }
    }
  }

  // Group by pattern type
  const grouped = new Map<Suggestion['patternType'], typeof pending>()
  for (const item of pending) {
    const key = item.suggestion.patternType
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(item)
  }

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-canopy-muted text-sm">
        <div className="text-3xl mb-2">✅</div>
        <p>No pending suggestions.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      {[...grouped.entries()].map(([patternType, items]) => (
        <div key={patternType}>
          <p className="text-[10px] uppercase tracking-widest text-canopy-muted mb-2 px-0.5">
            {PATTERN_LABELS[patternType]}
          </p>
          <div className="flex flex-col gap-2">
            {items.map(({ feature, suggestion }) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                feature={feature}
                onOpenDiff={() => onOpenDiff(feature.id, suggestion.id)}
                onDismiss={() => onDismiss(feature.id, suggestion.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function HistoryTab({ analysis }: { analysis: AnalysisResult }) {
  const history = [...analysis.history].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  )

  const totalSavedElectricity = history.reduce((s, h) => s + h.savingsElectricityKwh, 0)
  const totalSavedCarbon = history.reduce((s, h) => s + h.savingsCarbonKgCo2e, 0)

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-canopy-muted text-sm">
        <div className="text-3xl mb-2">📜</div>
        <p>No applied suggestions yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Cumulative savings banner */}
      <div className="bg-canopy-green/10 border border-canopy-green/30 rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-widest text-canopy-green mb-2">
          Cumulative Savings
        </p>
        <div className="flex gap-4">
          <div>
            <p className="text-canopy-green font-semibold text-sm tabular-nums">
              {totalSavedElectricity.toFixed(4)}
            </p>
            <p className="text-canopy-muted text-[10px]">kWh saved</p>
          </div>
          <div>
            <p className="text-canopy-green font-semibold text-sm tabular-nums">
              {totalSavedCarbon.toFixed(4)}
            </p>
            <p className="text-canopy-muted text-[10px]">kg CO₂e saved</p>
          </div>
        </div>
      </div>

      {/* History entries */}
      {history.map((entry) => (
        <div
          key={`${entry.suggestionId}-${entry.appliedAt}`}
          className="bg-canopy-card border border-canopy-border rounded-lg p-2.5 flex flex-col gap-1"
        >
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-canopy-text">{entry.featureName}</p>
            <span className="text-canopy-green text-[10px]">applied</span>
          </div>
          <p className="text-[10px] text-canopy-muted">{PATTERN_LABELS[entry.patternType as Suggestion['patternType']] ?? entry.patternType}</p>
          <div className="flex gap-3 text-[10px] text-canopy-muted mt-0.5">
            <span>⚡ -{entry.savingsElectricityKwh.toFixed(4)} kWh</span>
            <span>🌫️ -{entry.savingsCarbonKgCo2e.toFixed(4)} kg</span>
          </div>
          <p className="text-[10px] text-canopy-muted/60">
            {new Date(entry.appliedAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function SuggestionsPanel({ analysis, onOpenDiff, onDismiss }: Props) {
  const [tab, setTab] = useState<Tab>('pending')

  const pendingCount = analysis.features.reduce(
    (n, f) => n + f.suggestions.filter((s) => s.status === 'suggested').length,
    0
  )

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-canopy-border flex-shrink-0">
        {(['pending', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors capitalize
              ${tab === t
                ? 'text-canopy-green border-b-2 border-canopy-green'
                : 'text-canopy-muted hover:text-canopy-text'
              }`}
          >
            {t}
            {t === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-canopy-green/20 text-canopy-green rounded-full px-1.5 py-0.5 text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'pending' ? (
          <PendingTab analysis={analysis} onOpenDiff={onOpenDiff} onDismiss={onDismiss} />
        ) : (
          <HistoryTab analysis={analysis} />
        )}
      </div>
    </div>
  )
}
