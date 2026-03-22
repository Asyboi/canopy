import type { Feature } from '../lib/types'
import { TIER_COLORS, TIER_DOT_COLORS } from '../lib/constants'

interface Props {
  features: Feature[]
  selectedFeatureId: string | null
  onSelectFeature: (id: string) => void
}

const TIER_ORDER = { high: 0, medium: 1, low: 2 } as const

function TierBadge({ tier }: { tier: Feature['sustainabilityTier'] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${TIER_COLORS[tier]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${TIER_DOT_COLORS[tier]}`} />
      {tier}
    </span>
  )
}

export default function FeatureList({ features, selectedFeatureId, onSelectFeature }: Props) {
  const sorted = [...features].sort((a, b) => {
    const tierDiff = TIER_ORDER[a.sustainabilityTier] - TIER_ORDER[b.sustainabilityTier]
    if (tierDiff !== 0) return tierDiff
    return (b.sci?.sciGco2PerR ?? 0) - (a.sci?.sciGco2PerR ?? 0)
  })

  const pendingCount = (f: Feature) =>
    f.suggestions.filter((s) => s.status === 'suggested').length

  return (
    <div className="flex flex-col gap-1">
      <p className="text-canopy-muted text-[10px] uppercase tracking-widest px-0.5 mb-1">
        Features
      </p>
      {sorted.length === 0 && (
        <p className="text-canopy-muted text-xs px-0.5">No features detected.</p>
      )}
      {sorted.map((f) => {
        const pending = pendingCount(f)
        const sci = f.sci
        const isSelected = f.id === selectedFeatureId

        return (
          <button
            key={f.id}
            onClick={() => onSelectFeature(f.id)}
            className={`w-full text-left rounded-lg p-2.5 flex flex-col gap-1.5 border transition-all duration-150
              ${isSelected
                ? 'bg-canopy-accent/10 border-canopy-accent/50 shadow-[0_0_0_1px_rgba(63,175,116,0.25)]'
                : 'bg-canopy-card border-canopy-border hover:border-canopy-accent/30 hover:bg-canopy-card/80'
              }`}
          >
            <div className="flex items-start justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {/* Pending dot indicator */}
                <span
                  className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${pending > 0 ? 'bg-canopy-accent' : 'bg-canopy-muted/30'}`}
                />
                <span className="text-xs font-medium text-canopy-text leading-tight truncate">
                  {f.name}
                </span>
              </div>
              <TierBadge tier={f.sustainabilityTier} />
            </div>

            {sci && (
              <div className="flex items-center gap-1 text-[10px]">
                <span className={`font-medium font-mono ${isSelected ? 'text-canopy-accent' : 'text-canopy-accent/80'}`}>
                  ~{sci.sciGco2PerR.toFixed(0)} gCO₂
                </span>
                <span className="text-canopy-muted">/ day</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] text-canopy-muted">
              {sci && <span className="font-mono">E ~{sci.e_kwhPerR.toFixed(4)} kWh</span>}
              {pending > 0 && (
                <span className="ml-auto text-canopy-accent font-medium">
                  {pending} fix{pending > 1 ? 'es' : ''}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
